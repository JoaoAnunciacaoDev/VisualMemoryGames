import httpx
from fastapi import HTTPException, status

ITCH_API_URL = "https://api.itch.io"
# Para chaves de usuário a itch.io tem endpoints específicos ou usa Authorization Bearer
# Usaremos o header Authorization: Bearer <token> para todas as chamadas.


class ItchService:
    async def get_profile(self, access_token: str) -> dict:
        """Busca os dados do perfil do usuário na itch.io usando o token de acesso."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ITCH_API_URL}/profile", headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                # Tentar o fallback para o endpoint antigo caso o /profile exija outro formato
                response = await client.get(f"https://itch.io/api/1/{access_token}/me")
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token da itch.io inválido ou expirado.",
                    )

            data = response.json()
            return data.get("user", {})

    async def get_owned_keys(self, access_token: str) -> list:
        """Busca os jogos que o usuário possui na itch.io."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ITCH_API_URL}/profile/owned-keys",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if response.status_code != 200:
                # Fallback
                response = await client.get(f"https://itch.io/api/1/{access_token}/my-owned-keys")
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Falha ao buscar a biblioteca na itch.io.",
                    )

            data = response.json()
            return data.get("owned_keys", [])

    async def get_my_games(self, access_token: str) -> list:
        """Busca os jogos que o usuário desenvolveu na itch.io."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ITCH_API_URL}/profile/games", headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                # Fallback
                response = await client.get(f"https://itch.io/api/1/{access_token}/my-games")
                if response.status_code != 200:
                    return []  # Se falhar, retornamos lista vazia para não quebrar o sync

            data = response.json()
            return data.get("games", [])
