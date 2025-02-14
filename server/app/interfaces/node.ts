import { Coordinate } from '@common/interfaces/coordinate';
/**
 * Represents a tile node on the map, including its position, remaining moves, and movement cost.
 *
 * @property {Coordinate} position - The coordinates of the tile on the map.
 * @property {number} remainingMoves - The number of remaining moves to reach this tile.
 *                                     A value of `-1` indicates that this position has not been visited yet.
 * @property {number} cost - The movement cost to traverse this tile.
 *                           A value of `-1` means this position is impossible to visit (wall or closed door).
 */
export interface TileNode {
    position: Coordinate;
    remainingMoves: number;
    cost: number;
}
