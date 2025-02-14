import { LogTypeEvent } from '@common/enums/log-type';
import { BotProfile } from '@common/enums/virtual-player-profile';

export const IMAGES = {
    background: './assets/img/backgrounds/background.png',
    backgroundEditCreate: './assets/img/backgrounds/background-edit-create.png',
    iconAdminGame: './assets/img/icon-admin-game.png',
    iconCreatePart: './assets/img/icon-create-part.png',
    iconJoinPart: './assets/img/icon-join-part.png',
    logo: './assets/img/logo.png',
    backBtn: './assets/img/back-button.png',
};

export const TILE_IMAGES = {
    wall: './assets/img/tiles/wall.png',
    water: './assets/img/tiles/water.png',
    doorClosed: './assets/img/tiles/door-closed.png',
    doorOpened: './assets/img/tiles/door-opened.png',
    grass: './assets/img/tiles/grass.png',
    ice: './assets/img/tiles/ice.png',
    iceBreak: './assets/img/tiles/ice-break.png',
};

export const ITEM_IMAGES = {
    randomItem: './assets/img/items/random-item.png',
    startPositionItem: './assets/img/items/start-position-item.png',
    decreaseLoserWinsItem: './assets/img/items/decrease-loser-wins-item.png',
    flagItem: './assets/img/items/flag-item.png',
    boostAttackItem: './assets/img/items/boost-attack-item.png',
    boostDefenseItem: './assets/img/items/boost-defense-item.png',
    secondChanceItem: './assets/img/items/second-chance-item.png',
    doubleIceBreakItem: './assets/img/items/double-ice-break-item.png',
    swapOpponentLife: './assets/img/items/swap-opponent-life-item.png',
};

export const CHARACTER_IMAGES = {
    character1: './assets/img/characters/character1.png',
    character2: './assets/img/characters/character2.png',
    character3: './assets/img/characters/character3.png',
    character4: './assets/img/characters/character4.png',
    character5: './assets/img/characters/character5.png',
    character6: './assets/img/characters/character6.png',
    character7: './assets/img/characters/character7.png',
    character8: './assets/img/characters/character8.png',
    character9: './assets/img/characters/character9.png',
    character10: './assets/img/characters/character10.png',
    character11: './assets/img/characters/character11.png',
    character12: './assets/img/characters/character12.png',
};

export const INFOS_GAMES_ICONS: string[] = [
    './assets/img/create-party/max-players.png',
    './assets/img/create-party/max-items.png',
    './assets/img/create-party/start-point.png',
];

export const LOG_IMAGES: { [key in LogTypeEvent]: string } = {
    [LogTypeEvent.BeginParty]: './assets/img/logs/start-party.png',
    [LogTypeEvent.StartCombat]: './assets/img/logs/start-fight.png',
    [LogTypeEvent.StartTurn]: './assets/img/logs/start-turn.png',
    [LogTypeEvent.EndTurn]: './assets/img/logs/end-turn.png',
    [LogTypeEvent.AttackTo]: './assets/img/logs/start-fight.png',
    [LogTypeEvent.DefenseFrom]: './assets/img/logs/defense.png',
    [LogTypeEvent.EscapeFrom]: './assets/img/logs/escape-from.png',
    [LogTypeEvent.CollectItem]: './assets/img/logs/collect-Item.png',
    [LogTypeEvent.CollectFlag]: './assets/img/logs/collect-flag.png',
    [LogTypeEvent.CloseDoor]: './assets/img/logs/close-door.png',
    [LogTypeEvent.OpenDoor]: './assets/img/logs/open-door.png',
    [LogTypeEvent.QuitGame]: './assets/img/logs/give-up.png',
    [LogTypeEvent.EndGame]: './assets/img/logs/end-game.png',
    [LogTypeEvent.DebugOn]: './assets/img/logs/debug-on.png',
    [LogTypeEvent.DebugOff]: './assets/img/logs/debug-on.png',
    [LogTypeEvent.EndFight]: './assets/img/logs/end-fight.png',
    [LogTypeEvent.GiveUp]: './assets/img/logs/give-up.png',
    [LogTypeEvent.EndFightWithoutWinner]: './assets/img/logs/no-winner.png',
    [LogTypeEvent.ComputeDiceAttackBonus]: './assets/img/logs/dice-bonus.png',
    [LogTypeEvent.ComputeDiceDefenseBonus]: './assets/img/logs/dice-bonus.png',
    [LogTypeEvent.LossTheFlag]: './assets/img/logs/loss-flag.png',
};

export const BOT_PROFILES_IMAGES: { [key in BotProfile]: string } = {
    [BotProfile.Aggressive]: './assets/img/bot-profiles/aggressive.png',
    [BotProfile.Defensive]: './assets/img/bot-profiles/defensive.png',
};
