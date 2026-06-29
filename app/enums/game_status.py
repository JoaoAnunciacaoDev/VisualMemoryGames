from enum import Enum


class GameStatus(str, Enum):
    WANT_TO_PLAY = "Quero Jogar"
    PLAYING = "Jogando"
    FINISHED = "Zerado"
    PLATINUM = "Platinado"
    DROPPED = "Abandonado"
    ON_HOLD = "Em Espera"
