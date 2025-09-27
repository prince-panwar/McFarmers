export const IDL = {
  "address": "GjezjztjW5knE9JuvnCFtU7tu8WFmdgvzL4YHnb7PFRo",
  "metadata": {
    "name": "stake",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "user_stake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "pool.pool_type",
                "account": "Pool"
              },
              {
                "kind": "arg",
                "path": "stake_index"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "user_token_account",
          "writable": true
        },
        {
          "name": "token_vault",
          "writable": true
        },
        {
          "name": "token_program"
        }
      ],
      "args": [
        {
          "name": "stake_index",
          "type": "i64"
        }
      ]
    },
    {
      "name": "init_pool",
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
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "pool_type"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "token_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "mint"
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
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "apy",
          "type": "u64"
        },
        {
          "name": "pool_type",
          "type": {
            "defined": {
              "name": "PoolType"
            }
          }
        },
        {
          "name": "min_stake",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "user_stake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "pool.pool_type",
                "account": "Pool"
              },
              {
                "kind": "account",
                "path": "pool.stake_counter",
                "account": "Pool"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "user_token_account",
          "writable": true
        },
        {
          "name": "token_vault",
          "writable": true
        },
        {
          "name": "admin_token_account",
          "writable": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "user_stake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "pool.pool_type",
                "account": "Pool"
              },
              {
                "kind": "arg",
                "path": "stake_index"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "user_token_account",
          "writable": true
        },
        {
          "name": "token_vault",
          "writable": true
        },
        {
          "name": "admin_token_account",
          "writable": true
        },
        {
          "name": "token_program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "stake_index",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "UserStake",
      "discriminator": [
        102,
        53,
        163,
        107,
        9,
        138,
        87,
        153
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InsufficientStake",
      "msg": "Insufficient stake"
    },
    {
      "code": 6001,
      "name": "NoStake",
      "msg": "No stake found"
    },
    {
      "code": 6002,
      "name": "StillLocked",
      "msg": "Locking period not yet over"
    },
    {
      "code": 6003,
      "name": "AmountTooSmall",
      "msg": "Amount too small for operation"
    },
    {
      "code": 6004,
      "name": "NoRewards",
      "msg": "No rewards yet to claim"
    },
    {
      "code": 6005,
      "name": "Unauthorized",
      "msg": "Unauthorized to perform this action"
    },
    {
      "code": 6006,
      "name": "InvalidStakeIndex",
      "msg": "Invalid stake index"
    }
  ],
  "types": [
    {
      "name": "Pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "token_vault",
            "type": "pubkey"
          },
          {
            "name": "apy",
            "type": "u64"
          },
          {
            "name": "pool_type",
            "type": {
              "defined": {
                "name": "PoolType"
              }
            }
          },
          {
            "name": "lock_period",
            "type": "i64"
          },
          {
            "name": "min_stake",
            "type": "u64"
          },
          {
            "name": "total_staked",
            "type": "u64"
          },
          {
            "name": "stake_fee_bp",
            "type": "u64"
          },
          {
            "name": "unstake_fee_bp",
            "type": "u64"
          },
          {
            "name": "stake_counter",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "PoolType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Flexible"
          },
          {
            "name": "Locked"
          }
        ]
      }
    },
    {
      "name": "UserStake",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "last_stake_time",
            "type": "i64"
          },
          {
            "name": "pool_type",
            "type": {
              "defined": {
                "name": "PoolType"
              }
            }
          },
          {
            "name": "index",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "ADMIN_PUBKEY",
      "type": "pubkey",
      "value": "GdLfQn7SkU2MCH4vH1Q7cY8q3feHwhRFGJjHXNkRK3hS"
    }
  ]
}