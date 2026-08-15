from enum import Enum


class Store(str, Enum):
    STEAM = "STEAM"
    EPIC = "EPIC"
    GOG = "GOG"
    ITCH = "ITCH"
    PS_STORE = "PS_STORE"
    XBOX = "XBOX"
    NINTENDO = "NINTENDO"
    EA_APP = "EA_APP"
    UBISOFT = "UBISOFT"
    AMAZON = "AMAZON"
    GOOGLE_PLAY = "GOOGLE_PLAY"
    APP_STORE = "APP_STORE"
    PHYSICAL = "PHYSICAL"
    OTHER = "OTHER"
