use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use anchor_spl::{token_2022::TransferChecked, token_interface};

declare_id!("E72behkd9BgWX8R18WJ3VMzo3TYegPqzoMZF4PCpwZQT");

#[program]
pub mod swap {

    use super::*;

    pub fn init_pool(_ctx: Context<InitPool>) -> Result<()> {
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
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

    pub fn swap_a_b(ctx: Context<SwapAB>, amount_in: u64, min_amount_out: u64) -> Result<()> {
        let reserve_a = ctx.accounts.token_a_vault.amount;
        let reserve_b = ctx.accounts.token_b_vault.amount;
        // amout_out = res_a * am_in / res-b + am_in

        require!(reserve_a > 0, SwapError::InvalidAmount);
        require!(reserve_b > 0, SwapError::InvalidAmount);
        require!(amount_in > 0, SwapError::InvalidAmount);

        let amount_out = (reserve_b as u128)
            .checked_mul(amount_in as u128)
            .ok_or(SwapError::MathOverflow)?
            .checked_div(
                (reserve_a as u128)
                    .checked_add(amount_in as u128)
                    .ok_or(SwapError::MathOverflow)?,
            )
            .ok_or(SwapError::MathOverflow)?;

        let amount_out = amount_out as u64;

        require!(amount_out >= min_amount_out, SwapError::SlippageExceeded);

        require!(amount_out < reserve_b, SwapError::InsufficientLiquidity);

        let ctx_account = TransferChecked {
            from: ctx.accounts.user_a_ata.to_account_info(),
            to: ctx.accounts.token_a_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
            mint: ctx.accounts.token_a_mint.to_account_info(),
        };

        let cpi_ixn = CpiContext::new(ctx.accounts.token_program.key(), ctx_account);

        token_interface::transfer_checked(cpi_ixn, amount_in, ctx.accounts.token_a_mint.decimals)?;

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

#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        token::mint = token_a_mint,
        token::authority = token_a_vault,
        token::token_program = token_program,
        seeds = [b"samad-dex-vault", token_a_mint.key().as_ref()],
        bump
    )]
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        token::mint = token_b_mint,
        token::authority = token_b_vault,
        token::token_program = token_program,
        seeds = [b"samad-dex-vault",token_b_mint.key().as_ref()],
        bump
    )]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
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
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = token_b_mint,
        token::authority = token_b_vault,
        seeds = [b"samad-dex-vault",token_b_mint.key().as_ref()],
        bump
    )]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::authority = owner,
        token::mint = token_a_mint,
    )]
    pub owner_a_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::authority = owner,
        token::mint = token_b_mint,
    )]
    pub owner_b_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct SwapAB<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::authority = user,
        associated_token::mint = token_a_mint,
    )]
    pub user_a_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::authority = user,
        associated_token::mint = token_b_mint,
    )]
    pub user_b_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::authority = token_a_vault,
        token::mint = token_a_mint,
        seeds = [b"samad-dex-vault",token_a_mint.key().as_ref()],
        bump
    )]
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::authority = token_b_vault,
        token::mint = token_b_mint,
        seeds = [b"samad-dex-vault",token_b_mint.key().as_ref()],
        bump
    )]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,
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
