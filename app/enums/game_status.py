from enum import Enum


class GameStatus(str, Enum):
    IN_LIBRARY = "Na biblioteca"
    WANT_TO_PLAY = "Quero Jogar"
    PLAYING = "Jogando"
    FINISHED = "Zerado"
    PLATINUM = "Platinado"
    DROPPED = "Abandonado"
    ON_HOLD = "Em Espera"
