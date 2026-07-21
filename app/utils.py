import json


def safe_load_json_list(value: str | None) -> list[str]:
    """
    Carrega com segurança uma lista serializada em JSON ou faz fallback
    para strings separadas por vírgula em caso de falha de decodificação.
    """
    if not value:
        return []
    if isinstance(value, list):
        return [str(x) for x in value]
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
        return [str(parsed)]
    except (json.JSONDecodeError, TypeError):
        return [x.strip() for x in value.split(",") if x.strip()]
