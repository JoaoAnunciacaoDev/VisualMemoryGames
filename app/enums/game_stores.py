from enum import Enum


class Store(str, Enum):
    STEAM = "STEAM"
    EPIC = "Epic Games"
    GOG = "GOG"
    ITCH = "Itch.io"
    PS_STORE = "PlayStation Store"
    XBOX = "Xbox Store"
    NINTENDO = "Nintendo eShop"
    GOOGLE_PLAY = "Google Play"
    APP_STORE = "App Store"
    PHYSICAL = "Mídia Física"
    OTHER = "Outro"
