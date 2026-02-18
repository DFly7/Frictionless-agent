## ChessEngine Documentation

### Overview

This is a C++17 chess engine with two front-ends:

- UCI mode (command-line) for connecting to GUIs or testing.
- Optional SDL2-based GUI for visual play and interaction.

Key components:

- `Board` bitboard model and move application/undo
- `Move` struct describing a single move
- `MoveGenerator` pseudo-legal move generation (bitboard-based)
- `Evaluation` simple heuristic (material + knight PST)
- `Search` alpha-beta minimax (fixed depth)
- `UCIInterface` minimal command loop (subset of UCI)
- `GUI` (`View`, `TextureManager`, `RenderData`) using SDL2/SDL2_image

## Build and Run

### Prerequisites

- CMake 3.10+
- macOS with frameworks vendored under `third_party/`:
  - `SDL2.framework`
  - `SDL2_image.framework`

### Build

```bash
rm -rf build && mkdir build && cd build && cmake .. && make -j
```

The CMake setup links the SDL frameworks from `third_party/` and copies `Resources/` (piece images) into the build directory after linking.

### Run (UCI mode)

```bash
./ChessEngine
```

Supported commands (subset):

- `uci` → prints `uciok`
- `isready` → prints `readyok`
- `ucinewgame` → clears board
- `position FEN ...` → sets a position from a full FEN string (board/active/castling/en-passant fields required)
- `go` → runs search at fixed depth and prints a move string

Example:

```
uci
isready
position rnbqkbnr/pppp1ppp/8/3Pp3/8/8/PPPPP1PP/RNBQKBNR w KQkq e6
go
```

Note: Current output is a custom move format (e.g., `e2e4`-like but not fully UCI-compliant). See “Limitations” for details.

### Run (GUI mode)

```bash
./ChessEngine --gui
```

Controls:

- Click a source square, then a destination square. Legal-move enforcement is limited (pseudo-legal with some validations).

## Repository Layout

- `include/` public headers for core engine
- `src/` engine sources
  - `GUIStuff/` SDL view/texture/render data
  - `opening/` preliminary opening-book parsing (not yet integrated)
- `Resources/Images/` chess piece images used by the GUI
- `third_party/` vendored Apple frameworks for SDL2 and SDL2_image
- `CMakeLists.txt` build configuration

## Data Model and Conventions

### Bitboards

The engine uses one `uint64_t` bitboard per piece set, plus aggregates:

- White: `WhitePawns`, `WhiteKnight`, `WhiteBishop`, `WhiteRook`, `WhiteQueen`, `WhiteKing`
- Black: `BlackPawns`, `BlackKnight`, `BlackBishop`, `BlackRook`, `BlackQueen`, `BlackKing`
- Aggregates: `WhitePieces`, `BlackPieces`, `AllPieces`

Bit index mapping: index = `row * 8 + col` with `row` and `col` in `[0..7]`.

### Coordinates and Notation

- Internal rows/cols: `row ∈ [0..7]`, `col ∈ [0..7]`
- `ChessUtils` maps between internal coordinates and chess notation:
  - Files: `a..h` mapped by column
  - Ranks: `'1'..'8'` mapped by row index (`0 → '1'`, `7 → '8'`)
  - `coordsToSquare(row, col)` and `squareToCoords("e4")`

Note: FEN parsing starts from rank 8 and processes down to rank 1; the code translates to internal row/col accordingly.

### Castling Rights

Stored as a 4-bit bitfield on `Board::castlingRights`:

- Bit 0 (1): White king-side `K`
- Bit 1 (2): White queen-side `Q`
- Bit 2 (4): Black king-side `k`
- Bit 3 (8): Black queen-side `q`

### En Passant

`Board::enPassant` stores the en-passant target square in algebraic notation (e.g., `e6`) or `"-"` if unavailable.

### Move Representation

`Move` struct fields:

- `pieceName` char: `'P','N','B','R','Q','K'` (white) or lowercase for black
- `capture` char: captured piece letter or `\0` for none
- `castling` int: `0` none, `1` king-side, `2` queen-side
- `promotion` char: promotion piece letter or `\0`
- `startR`, `startC`, `endR`, `endC`: start/end row/column
- `enPassantMove` bool: true if this move is an en-passant capture

## Modules

### Board

Responsibilities:

- Hold all bitboards and derived aggregates
- Track `player` to move (`1` = white, `2` = black)
- Track `castlingRights` and `enPassant`
- Parse FEN via `setBitBoard(fen)`: supports board layout, active color, castling rights, en-passant target
- Apply/undo moves via `makeMove(Move&)` and `undoMove(Move&)`
- Access bitboards via `getBitBoard(char)` and debug print via `printBitBoards()`

Key behaviors:

- `makeMove` updates captures (including en-passant), promotions (auto-queen at last rank), castling-rights changes when a rook moves, aggregates, en-passant square for double pawn pushes, and toggles `player`.
- `undoMove` reverts promotions, restores captured piece on the end square, moves the piece back, restores castling rook placement for castling moves, and toggles `player`.

Notes:

- Castling legality does not currently check for attacked squares.
- Promotions auto-upgrade to queen; underpromotions are not implemented.

### MoveGenerator

Responsibilities:

- Maintain a snapshot of the board state for generation (`updateBoardReferences`)
- Generate pseudo-legal moves for all piece types:
  - `GenerateWhitePawnMoves`, `GenerateBlackPawnMoves` (single/double pushes, captures, en-passant)
  - `GenerateKnightMoves`, `GenerateBishopMoves`, `GenerateRookMoves`, `GenerateQueenMoves`, `GenerateKingMoves`
  - `kingCastling` adds castling moves if path is clear and rights exist
- `generateMoves(const Board&)` collects all piece moves for the side to move

Notes:

- `isKingInCheck/Checkmate/Stalemate` are placeholders (return `false`).
- No filtering for self-check; moves are pseudo-legal.
- `kingCastling` checks empty path and rights, but not check conditions on traversed squares.

### Evaluation

Responsibilities:

- Compute a simple evaluation:
  - Material count with standard weights
  - Knight piece-square table (PST) bonus/penalty for both sides

### Search

Responsibilities:

- Fixed-depth alpha-beta minimax (`maxDepth` default 4)
- Uses `MoveGenerator` for moves and `Evaluation` for leaf nodes
- Applies/undos moves on the shared `Board`

Behavior:

- For the root, determines `isWhite = (board.player == 1)`; white maximizes, black minimizes.
- At each node, alpha-beta pruning is applied.

### ChessUtils

Responsibilities:

- Coordinate and algebraic notation conversion helpers:
  - `coordsToSquare(row, col)` → `"e4"`
  - `squareToCoords("e4")` → `(row, col)`
  - Char helpers: `fileToChar`, `rankToChar`, `charToFile`, `charToRank`

### UCIInterface

Responsibilities:

- Minimal read-eval loop on stdin
- Commands: `uci`, `isready`, `ucinewgame`, `position <FEN...>`, `go`
- On `go`, runs `Search::search` and prints a move string

Notes:

- Output is not standard UCI (`bestmove e2e4` is not implemented). See “Limitations”.

### GUI (SDL)

Components:

- `View` initializes SDL, loads textures with `TextureManager`, handles click events, and renders the board and pieces.
- `TextureManager` loads PNGs with `SDL2_image` and provides texture lookup by piece letter.
- `RenderData` snapshots the `Board` bitboards into arrays of piece types and screen positions for rendering.

Assets:

- Piece images are in `Resources/Images`. The build copies `Resources/` to the build directory.

### Opening (Prototype)

- `opening/Opening.cpp` reads a PGN file (`twic1560.pgn`) and prints initial parsed lines.
- Not integrated into search yet.

## Main Entrypoint and Modes

- `main.cpp` selects mode based on CLI:
  - `--gui` → starts GUI loop and manual move entry via mouse.
  - default → starts `UCIInterface` loop on stdin.

## FEN Support

`Board::setBitBoard` expects at least the first four FEN fields:

```
<piece placement> <active color> <castling rights> <en passant>
```

Example used in development:

```
rnbqkbnr/pppp1ppp/8/3Pp3/8/8/PPPPP1PP/RNBQKBNR w KQkq e6
```

## Limitations and Future Work

- Move legality:
  - No self-check filtering; generator produces pseudo-legal moves.
  - Castling does not check attacked squares or king in check conditions.
- UCI compliance:
  - Does not print `id` info or `bestmove` lines; prints a custom move string.
  - `position startpos` is not implemented; FEN must be provided explicitly.
- Evaluation:
  - Basic material + knight PST only; no game-phase, mobility, king safety, pawn structure, etc.
- Promotions:
  - Auto-queen only; underpromotion not supported.
- Opening book:
  - PGN parser prototype not wired into search/move selection.
- GUI:
  - Minimal validation; relies on generator/board logic; no highlight of legal moves; basic visuals.
- Memory management:
  - Some manual cleanup patterns in GUI code could be modernized with RAII/smart pointers.

## Quick API Notes (for contributors)

- `Board::makeMove(Move&)` mutates board and toggles `player`; always `undoMove` when exploring moves.
- `MoveGenerator::updateBoardReferences(const Board&)` must be called before generation when internal state is reused.
- Use `ChessUtils` for square/coordinate conversions to avoid off-by-one and orientation issues.

## Acknowledgments

- SDL2 and SDL2_image for GUI rendering.
