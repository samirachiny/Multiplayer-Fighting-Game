import { MessageDialogType } from '@app/enums/message-dialog-type';
import { MessageDialogData } from '@app/interfaces/message-dialog-data';
import { GameMapSize, GameMode, ItemsPerMapSize, PlayersPerMapSize, StartingPointPerMapSize } from '@common/enums/game-infos';
import { BOT_PROFILES_IMAGES } from '@app/constants/image';
import { VirtualPlayerProfile } from '@app/interfaces/virtual-player-profile';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { MatSnackBarConfig } from '@angular/material/snack-bar';
import { FightMessageTemplates } from '@app/types/fight-message-templates';

export const IMAGE_LOAD_DELAY = 1000;
export const MAP_SIZE_OPTIONS: GameMapSize[] = [GameMapSize.Small, GameMapSize.Medium, GameMapSize.Large];
export const GAME_MODE_OPTIONS: GameMode[] = [GameMode.Classic, GameMode.Flag];
export const ITEMS_PER_MAP_SIZE_OPTIONS: ItemsPerMapSize[] = [ItemsPerMapSize.Small, ItemsPerMapSize.Medium, ItemsPerMapSize.Large];
export const PLAYERS_PER_MAP_SIZE_OPTIONS: PlayersPerMapSize[] = [PlayersPerMapSize.Small, PlayersPerMapSize.Medium, PlayersPerMapSize.Large];

export const DATA_ICONS: { [key: number]: number } = {
    [GameMapSize.Small]: StartingPointPerMapSize.Small,
    [GameMapSize.Medium]: StartingPointPerMapSize.Medium,
    [GameMapSize.Large]: StartingPointPerMapSize.Large,
};
export const ITEMS_MAX_PER_MAP_SIZE: { [key: number]: number } = {
    [GameMapSize.Small]: ItemsPerMapSize.Small,
    [GameMapSize.Medium]: ItemsPerMapSize.Medium,
    [GameMapSize.Large]: ItemsPerMapSize.Large,
};
export enum FeedbacksMessages {
    ShouldAssignDice = 'Assignez les dés aux attributs attaque ou defense',
    ShouldAddPlayerName = 'Saissisez votre nom',
    ShouldUpgradeLifeOrSpeed = "Augmentez l'un des attributs(vie ou rapidité)",
}
export const IMG_QUALITY = 0.5;
export const IMG_TYPE = 'image/jpeg';

export const MESSAGE_DIALOG: { [key: string]: MessageDialogData } = {
    gameNotAvailable: {
        type: MessageDialogType.Error,
        title: 'Impossible de continuer',
        body: 'Le jeu que vous essayez de jouer a ete supprimé ou caché',
    },
    serverError: {
        type: MessageDialogType.Error,
        title: 'Erreur du serveur',
        body: "L'acces ou modification des jeux n'a pas pu etre faite car:",
    },
    customAvatarIssues: {
        type: MessageDialogType.Warning,
        title: 'Personnaliser votre joueur',
        body: "S'il vous plaît veuillez personnaliser votre joueur",
    },
    gameSelectedNotAvailable: {
        type: MessageDialogType.Error,
        title: 'Erreur de selection',
        body: 'Le jeu selectionné a ete supprimé',
    },
    confirmGameSuppression: {
        type: MessageDialogType.Information,
        title: 'Confirmation de suppresion',
        body: 'Voulez-vous vraiment supprimer le jeu: ',
    },
    partyPlayersFull: {
        type: MessageDialogType.Information,
        title: 'Information',
        body: 'La partie est pleine, veuillez rejoindre une autre jeu',
    },
    partyLocked: {
        type: MessageDialogType.Information,
        title: 'Information',
        body: "La partie est verrouillée. Voulez-vous réessayer ou revenir à la vue d'accueil ?",
    },
    playerLeftParty: {
        type: MessageDialogType.Information,
        title: 'Information',
        body: ' vient de quitter la partie.',
    },
    youLeftParty: {
        type: MessageDialogType.Information,
        title: 'Information',
        body: 'Vous venez de quitter la partie.',
    },
    playerEjected: {
        type: MessageDialogType.Information,
        title: 'Information',
        body: " vient d'être exclu par l'organisateur.",
    },
    youEjectedFromParty: {
        type: MessageDialogType.Information,
        title: 'Information',
        body: "Vous venez d'être exclu par l'organisateur.",
    },
    partyCancelled: {
        type: MessageDialogType.Information,
        title: 'Partie annulée',
        body: "L'organisateur a terminé la partie ｡°(°.◜ᯅ◝°)°｡",
    },
    gameSelectionError: {
        type: MessageDialogType.Error,
        title: 'Erreur de sélection',
        body: 'Le jeu ne peut pas étre selectionnée',
    },
    allPlayerGiveUp: {
        type: MessageDialogType.Information,
        title: 'Partie terminé',
        body: 'Tous les joueurs humains ont abandonnés la partie.',
    },
    partyStarted: {
        type: MessageDialogType.Information,
        title: 'Partie en cours',
        body: 'La partie est en cours veuillez entrer dans une autre partie.',
    },
    gameEnd: {
        type: MessageDialogType.Information,
        title: 'Fin de la partie',
        body: ' a remporté la partie',
    },
};
export const GIVE_UP_CONFIRMATION = 'Êtes vous sur de vouloir abandonner la partie ?';
export const BASE_ATTRIBUTE_VALUE = 4;
export const NUMBER_OF_ADJACENT_CHARACTERS_TO_DISPLAY = 3;
export const MIN_ACCESS_CODE = 1000;
export const MAX_ACCESS_CODE_RANGE = 9000;
export const DECIMAL_TILE_BASE = 10;
export const DECIMAL_BASE = 10;
export const MAP_HEIGHT = 600;
export const MAP_WIDTH = 600;
export const MAP_IMPORT_DIMENSION = 400;
export const CREATE_GAME_PARAMS = 'create-game-params';
export const MAX_NAME_LENGTH = 20;
export const MAX_DESCRIPTION_LENGTH = 200;

export const MEMBERS: string[] = [
    'Beaurel Fohom Takala',
    'Christ Bouka',
    'Raissa Oumarou Petitot',
    'Rym Touati',
    'Samira Chiny Folefack Temfack',
    'Aymane Bourchich',
];

export const TITLE = 'RPG CRAFTER';

export const PLENTY_TIME_COLOR = '#80ba3f';
export const AVERAGE_TIME_COLOR = '#edb200';
export const END_TIME_COLOR = 'hsl(0, 45%, 53%)';
export const MAX_COLOR_VALUE = 255;
export const CIRCLE_RADIUS_SCALE = 8;
export const CIRCLE_COLOR = 'white';
export const DICE_ROLL_UPDATE_INTERVAL = 500;
export const MAX_D6_VALUE = 6;
export const MAX_D4_VALUE = 4;
export const STAT_BONUS = 2;
export const RIGHT_CLICK = 2;

export const DESCRIPTIONS = {
    boostAttackItem: 'Épée de Damoclès: ajoute 2 points à ton attaque',
    boostDefenseItem: 'Bouclier céleste: ajoute 2 points à ta défense',

    swapOpponentLifeItem: "Échangeur d'Âmes: permute tes points de vie et ceux de ton adversaire lorsqu'il te reste 2 point de vie",
    secondChance: 'Amulette du Dernier Souffle: augmente 2 points de vie durant le combat si ta vie est à 1',

    doubleIceBreakItem: 'Givre Instable: double les chances de tomber sur une glace',
    decreaseLoserWins: 'Couronne Déchue: reduit le nombre de combat gagné par le perdant de 1 après un combat',

    flagItem: "Drapeau: je suis l'element le plus important du jeu. Attrapez moi vite et retournez a votre point de départ pour gagner!",
    startPositionItem: 'Point de départ: point de depart, un depart victorieux!',
    randomItem: 'Item aléatoire: je peux etre ce que vous voulez... ou pas, Ramassez moi et on le decouvrira ensemble!',

    doorTile: 'Porte: Ouvre une porte au lieu de contourner coût 1 point de mouvement',
    iceTile: 'Glace: Deplacement infini mais risque de tomber coût 0 point de mouvement',
    wallTile: 'Mur: vous ne pouvez pas traverser un mur',
    waterTile: 'Eau: Nager est plus dure que marcher, coût 2 points de mouvements',
    tile: 'Herbe: Vert accueillant, un terrain tout a fait commun, cout 1 point de mouvement',
};
export const CONFIRMATION_LEAVE_PARTY = 'Êtes vous sur de vouloir quitter la partie ?';
export const CONFIRMATION_EJECT_PLAYER = 'Êtes vous sur de vouloir exclure ce joueur ?';
export const CONFIRMATION_HEADER = 'Confirmation';
export const GAME_KEY = 'gameId';
export const ICON_OPTIONS = ['groups', 'category', 'location_on'];
export const ICON_DESCRIPTIONS = ['Nombre de joueurs maximum', "Nombre d'items maximum", 'Nombre de points de départ total'];
export const END_GAME_DELAY = 4000;
export const HALF_TIME = 15;
export const LAST_TIME = 7;
export const WAITING_TIME = 100;
export const DELAY_TO_SHOW_DAMAGE = 2000;
export const PLAYER_STATISTICS_COLUMN_NAMES: string[] = [
    'playerName',
    'numberOfFights',
    'numberOfEscapes',
    'numberOfWins',
    'numberOfDefeats',
    'totalHealthLost',
    'totalDamageDealt',
    'numberOfObjectsCollected',
    'percentageOfMapTilesVisited',
];
export const ALL_VIRTUAL_PLAYER_PROFILE: VirtualPlayerProfile[] = [
    {
        botProfile: BotProfile.Aggressive,
        description: 'Profil aggressif',
        image: BOT_PROFILES_IMAGES.aggressive,
    },
    {
        botProfile: BotProfile.Defensive,
        description: 'Profil defensif',
        image: BOT_PROFILES_IMAGES.defensive,
    },
];

export const HIGH_LIGHT_OPACITY = 0.2;
export const CANVAS_DIMENSION = '2d';

export const EXPORT_FILE_TYPE = 'application/json';
export const EXPORT_FILE_EXTENSION = '.json';

export const GAME_VALIDATION_FILE_ERRORS = {
    jsonFileEmpty: 'Fichier JSON vide.',
    jsonFileInvalid: 'Format du Fichier JSON invalide.',
    gameNameInvalid: 'Nom du jeu invalide ou absent. Le nom doit avoir au maximum 20 caractères.',
    gameModeInvalid: "Mode de jeu invalide ou absent. Le mode doit être soit classique 'Classic' ou capture de flag 'Flag'.",
    gameMapInvalid: 'Carte du jeu invalide. La carte doit être carrée.',
    gameMapMissing: 'Carte du jeu est absente',
    gameMapSizeInvalid: 'La taille de la map est invalide. La taille de la map doit être soit 10, 15 ou 20.',
    gameMapTileInvalid: 'La map est invalide. La map doit contenir des valeurs valides.',
    gameDescriptionInvalid: 'Description du jeu invalide ou absente. La description doit avoir au maximum 200 caractères.',
};
export const TILE_TYPE = 'number';

export const GAME_IMPORTATION_ERROR_TITLE = "Erreur d'importation du jeu";
export const GAME_IMPORTATION_ERROR_HEADER = "L'importation a échoué car: ";
export const GAME_REGISTRATION_ERROR_TITLE = "Erreur d'enregistrement du jeu";
export const GAME_REGISTRATION_ERROR_HEADER = "L'enregistrement a échoué car: ";
export const GAME_REGISTRATION_SUCCESSFUL_MESSAGE = "Succès de l'enregistrement !";

export const IMG_LOAD_ERROR_HEADER = "Erreur de chargement de l'image: ";
export const GAME_LOAD_ERROR_HEADER = 'Erreur lors de la récuperation du jeu';
export const NEW_GAME_INVALID_ERROR_HEADER = 'Données non valide. La taille ou le mode lu jeu sont invalides';

export const BASE_ERROR_TITLE = 'Erreur';
export const GAME_ID_KEY_NAME = 'id';

export const SNACK_BAR_PROPERTIES_SET_UP: MatSnackBarConfig = {
    duration: 2000,
    verticalPosition: 'top',
    horizontalPosition: 'center',
    panelClass: ['snack-bar'],
};
export const SNACK_BAR_PROPERTIES_SET_UP_SUCCESS: MatSnackBarConfig = {
    ...SNACK_BAR_PROPERTIES_SET_UP,
    panelClass: ['snack-bar', 'snack-bar-success'],
};

export const SNACK_BAR_PROPERTIES_SET_UP_ERROR: MatSnackBarConfig = {
    ...SNACK_BAR_PROPERTIES_SET_UP,
    panelClass: ['snack-bar', 'snack-bar-error'],
};

export const urlBase = {
    game: 'game',
};

export const SOCKET_TRANSPORT_NAME = 'websocket';

export const DEBUG_MODE_ACTIVATED = 'Mode debogage activé';
export const DEBUG_MODE_DEACTIVATED = 'Mode debogage desactivé';

export const CREATE_GAME_PAGE_OPTION = 'create';

export const NO_DICE_NUMBER_SYMBOL = '?';

export const FIGHT_MESSAGES: FightMessageTemplates = {
    escapeFailed: () => "Ta tentative d'évasion a échoué",
    opponentEscapeFailed: (name?: string) => `La tentative d'évasion de ${name} a echoué`,
    escapeSuccessful: () => "Ta tentative d'évasion a réussi",
    opponentEscapeSuccessful: (name?: string) => `La tentative d'évasion de ${name} a réussi`,
    attackSuccessful: () => "'Ton attaque a réussi",
    opponentAttackSuccessful: (name?: string) => `L'attaque de ${name} a réussi`,
    attackFailed: () => 'Ton attaque a echoué',
    opponentAttackFailed: (name?: string) => `L'attaque de ${name} a echoué`,
    turnStarted: () => "C'est votre tour",
    opponentTurnStarted: (name?: string) => `C'est le tour de ${name}`,
    opponentGaveUp: (name?: string) => `${name} a abandonné la partie`,
    youWon: () => 'Vous avez gagné le combat',
    youLost: () => 'Vous avez perdu le combat',
};

export const DRAG_DATA_ENABLED_INDEX = 'isValidDragItem';

export const CONFIRMATION_CANCELLATION_DETAILS = {
    title: 'Confirmation Annulation',
    body: 'Voulez-vous vraiment annuler les modifications apportées au jeu',
};
