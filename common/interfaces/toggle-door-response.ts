import { Coordinate } from './coordinate';
import { DoorState } from '../enums/tile';

export interface ResponseToggleDoor{
    doorPosition: Coordinate;
    doorState: DoorState
}