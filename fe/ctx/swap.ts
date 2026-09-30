/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/swap.json`.
 */
export type Swap = {
  "address": "75AzmcJ8rGx3pmJmeYwkCAFRxWNqJhf7EBmNBaJJP3Kr",
  "metadata": {
    "name": "swap",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLiquidity",
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "tokenAMint"
        },
        {
          "name": "tokenBMint"
        },
        {
          "name": "tokenAVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  109,
                  97,
                  100,
                  45,
                  100,
                  101,
                  120,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenAMint"
              }
            ]
          }
        },
        {
          "name": "tokenBVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  109,
                  97,
                  100,
                  45,
                  100,
                  101,
                  120,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenBMint"
              }
            ]
          }
        },
        {
          "name": "ownerAAta",
          "writable": true
        },
        {
          "name": "ownerBAta",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amountA",
          "type": "u64"
        },
        {
          "name": "amountB",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initPool",
      "discriminator": [
        116,
        233,
        199,
        204,
        115,
        159,
        171,
        36
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAMint"
        },
        {
          "name": "tokenBMint"
        },
        {
          "name": "tokenAVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  109,
                  97,
                  100,
                  45,
                  100,
                  101,
                  120,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenAMint"
              }
            ]
          }
        },
        {
          "name": "tokenBVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  109,
                  97,
                  100,
                  45,
                  100,
                  101,
                  120,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenBMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "swapAB",
      "discriminator": [
        17,
        45,
        205,
        225,
        137,
        206,
        64,
        242
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAMint"
        },
        {
          "name": "tokenBMint"
        },
        {
          "name": "userAAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "tokenAMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userBAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "tokenBMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenAVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  109,
                  97,
                  100,
                  45,
                  100,
                  101,
                  120,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenAMint"
              }
            ]
          }
        },
        {
          "name": "tokenBVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  109,
                  97,
                  100,
                  45,
                  100,
                  101,
                  120,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenBMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minAmountOut",
          "type": "u64"
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "emptyPool",
      "msg": "Pool has not liquidity."
    },
    {
      "code": 6001,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero."
    },
    {
      "code": 6002,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6003,
      "name": "insufficientLiquidity",
      "msg": "Insufficient Liquidity."
    },
    {
      "code": 6004,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded."
    }
  ]
};
