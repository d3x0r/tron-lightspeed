# Grid cell encoding

Board: 1000×1000 small integers (`Uint16Array` cells + `Float32Array` write-times).

Direction codes: **0 north, 1 west/left, 2 south/down, 3 east/right**.

## uint16 word

```
bits 15-12  occupant id   0 = empty, 1..15 = player or pillar id
bits 11-8   turn          0 = straight, 1 = bend, 2 = u-turn, 3 = opposite bend
bits  7-4   IN            edge the cycle ENTERED FROM
bits  3-0   flags         bit0 = pillar (color-cycles by world second)
                          bit1 = permanent wall
```

`OUT = (IN + 2 + turn) % 4`

Time of write is **not** packed; it lives in the parallel `time[]` array as world seconds.

## Sketch examples

| word   | id | turn | IN    | OUT        | meaning                                      |
|--------|----|------|-------|------------|----------------------------------------------|
| 0x1000 | 1  | 0    | north | south/down | entered from north, went straight south      |
| 0x1100 | 1  | 1    | north | east/right | entered from north, turned, exited east      |

Traveling in direction D, a straight cell has `IN = (D+2)%4`, `OUT = D`, `turn = 0`.

Turn resolution **is** the grid: heading only changes inside a cell (the OUT nibble is rewritten; IN and write-time stay).

See `ui/cellEncoding.js`.
