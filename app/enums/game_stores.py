from enum import Enum


class Store(str, Enum):
    STEAM = "STEAM"
    EPIC = "EPIC"
    GOG = "GOG"
    ITCH = "ITCH"
    PS_STORE = "PS_STORE"
    XBOX = "XBOX"
    NINTENDO = "NINTENDO"
    GOOGLE_PLAY = "GOOGLE_PLAY"
    APP_STORE = "APP_STORE"
    PHYSICAL = "PHYSICAL"
    OTHER = "OTHER"
