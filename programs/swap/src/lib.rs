//! A constant-product (x · y = k) AMM for one pair of tokens.
//!
//! The pool is two token accounts ("vaults"), one per mint. Each vault is a
//! PDA that is also its own authority, so only this program can move tokens
//! out of it, by signing with the vault's seeds.
//!
//! Instructions: `init_pool` creates the vaults, `add_liquidity` deposits into
//! them, `swap_a_b` trades A for B. Uses `token_interface`, so both classic SPL
//! Token and Token-2022 mints work.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use anchor_spl::{token_2022::TransferChecked, token_interface};

declare_id!("75AzmcJ8rGx3pmJmeYwkCAFRxWNqJhf7EBmNBaJJP3Kr");

#[program]
pub mod swap {

    use super::*;

    /// Creates the two vaults. All the work happens in the `InitPool` account
    /// constraints, so the body is empty.
    pub fn init_pool(_ctx: Context<InitPool>) -> Result<()> {
        Ok(())
    }

    /// Moves `amount_a` and `amount_b` from the owner into the vaults.
    /// No LP tokens and no ratio check yet (see the README to-do list).
    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
        // transfer_checked (rather than transfer) also verifies the mint and
        // decimals, and is required for Token-2022 mints.
        let ctx_account = TransferChecked {
            from: ctx.accounts.owner_a_ata.to_account_info(),
            to: ctx.accounts.token_a_vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
            mint: ctx.accounts.token_a_mint.to_account_info(),
        };

        let cpi_ixn = CpiContext::new(ctx.accounts.token_program.key(), ctx_account);

        token_interface::transfer_checked(cpi_ixn, amount_a, ctx.accounts.token_a_mint.decimals)?;

        let ctx_account = TransferChecked {
            from: ctx.accounts.owner_b_ata.to_account_info(),
            to: ctx.accounts.token_b_vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
            mint: ctx.accounts.token_b_mint.to_account_info(),
        };

        let cpi_ixn = CpiContext::new(ctx.accounts.token_program.key(), ctx_account);

        token_interface::transfer_checked(cpi_ixn, amount_b, ctx.accounts.token_b_mint.decimals)?;
        Ok(())
    }

    /// Sells `amount_in` of A for B. Fails if the output would be less than
    /// `min_amount_out`, which protects the trader from the price moving.
    pub fn swap_a_b(ctx: Context<SwapAB>, amount_in: u64, min_amount_out: u64) -> Result<()> {
        // The reserves are simply the vault balances.
        let reserve_a = ctx.accounts.token_a_vault.amount;
        let reserve_b = ctx.accounts.token_b_vault.amount;

        require!(reserve_a > 0, SwapError::InvalidAmount);
        require!(reserve_b > 0, SwapError::InvalidAmount);
        require!(amount_in > 0, SwapError::InvalidAmount);

        // Keeping x · y = k constant:
        //   amount_out = reserve_b * amount_in / (reserve_a + amount_in)
        // Done in u128 so the multiplication can't overflow. Integer division
        // rounds down, in the pool's favour.
        let amount_out = (reserve_b as u128)
            .checked_mul(amount_in as u128)
            .ok_or(SwapError::MathOverflow)?
            .checked_div(
                (reserve_a as u128)
                    .checked_add(amount_in as u128)
                    .ok_or(SwapError::MathOverflow)?,
            )
            .ok_or(SwapError::MathOverflow)?;

        // Safe cast: the result is always less than reserve_b, which is a u64.
        let amount_out = amount_out as u64;

        require!(amount_out >= min_amount_out, SwapError::SlippageExceeded);

        require!(amount_out < reserve_b, SwapError::InsufficientLiquidity);

        // 1. The trader pays A into the pool. The trader signed the transaction,
        //    so a plain CpiContext is enough.
        let ctx_account = TransferChecked {
            from: ctx.accounts.user_a_ata.to_account_info(),
            to: ctx.accounts.token_a_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
            mint: ctx.accounts.token_a_mint.to_account_info(),
        };

        let cpi_ixn = CpiContext::new(ctx.accounts.token_program.key(), ctx_account);

        token_interface::transfer_checked(cpi_ixn, amount_in, ctx.accounts.token_a_mint.decimals)?;

        // 2. The pool pays B out. The vault is its own authority and has no
        //    private key, so the program signs for it with the vault's seeds.
        let ctx_account = TransferChecked {
            from: ctx.accounts.token_b_vault.to_account_info(),
            to: ctx.accounts.user_b_ata.to_account_info(),
            mint: ctx.accounts.token_b_mint.to_account_info(),
            authority: ctx.accounts.token_b_vault.to_account_info(),
        };

        let token_b_mint = ctx.accounts.token_b_mint.key();

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"samad-dex-vault",
            token_b_mint.as_ref(),
            &[ctx.bumps.token_b_vault],
        ]];

        let cpi_ixn = CpiContext::new(ctx.accounts.token_program.key(), ctx_account)
            .with_signer(signer_seeds);

        token_interface::transfer_checked(cpi_ixn, amount_out, ctx.accounts.token_b_mint.decimals)?;

        Ok(())
    }
}

// Account structs: Anchor checks every constraint below before the instruction
// body runs. Token accounts are boxed (moved to the heap) because unboxed they
// overflow the 4 KB stack frame in the generated `try_accounts`.

#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,

    // A PDA token account that owns itself. Seeded by the mint only, so every
    // pool that uses this mint would share the vault (README to-do: add a Pool
    // account seeded by both mints).
    #[account(
        init_if_needed,
        payer = owner,
        token::mint = token_a_mint,
        token::authority = token_a_vault,
        token::token_program = token_program,
        seeds = [b"samad-dex-vault", token_a_mint.key().as_ref()],
        bump
    )]
    pub token_a_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
        token::mint = token_b_mint,
        token::authority = token_b_vault,
        token::token_program = token_program,
        seeds = [b"samad-dex-vault",token_b_mint.key().as_ref()],
        bump
    )]
    pub token_b_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    // The seeds + bump constraints below make Anchor check that the vaults
    // passed in really are this program's PDAs for these mints.
    pub owner: Signer<'info>,

    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = token_a_mint,
        token::authority = token_a_vault,
        // token::state= TokenAccount
        seeds = [b"samad-dex-vault",token_a_mint.key().as_ref()],
        bump
    )]
    pub token_a_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        token::mint = token_b_mint,
        token::authority = token_b_vault,
        seeds = [b"samad-dex-vault",token_b_mint.key().as_ref()],
        bump
    )]
    pub token_b_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::authority = owner,
        token::mint = token_a_mint,
    )]
    pub owner_a_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::authority = owner,
        token::mint = token_b_mint,
    )]
    pub owner_b_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct SwapAB<'info> {
    // `associated_token::token_program` matters: the ATA address depends on the
    // token program, and without it Anchor assumes classic SPL Token, so
    // Token-2022 ATAs fail with ConstraintAssociated.
    #[account(mut)]
    pub user: Signer<'info>,

    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::authority = user,
        associated_token::mint = token_a_mint,
        associated_token::token_program = token_program,
    )]
    pub user_a_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    // Created on the fly if the trader has never held B, paid by the trader.
    #[account(
        init_if_needed,
        payer = user,
        associated_token::authority = user,
        associated_token::mint = token_b_mint,
        associated_token::token_program = token_program,
    )]
    pub user_b_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        token::authority = token_a_vault,
        token::mint = token_a_mint,
        seeds = [b"samad-dex-vault",token_a_mint.key().as_ref()],
        bump
    )]
    pub token_a_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        token::authority = token_b_vault,
        token::mint = token_b_mint,
        seeds = [b"samad-dex-vault",token_b_mint.key().as_ref()],
        bump
    )]
    pub token_b_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum SwapError {
    #[msg("Pool has not liquidity.")]
    EmptyPool,

    #[msg("Amount must be greater than zero.")]
    InvalidAmount,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Insufficient Liquidity.")]
    InsufficientLiquidity,

    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,
}
