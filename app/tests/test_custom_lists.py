from typing import Any, Dict, List as ListType

def test_create_list(client, auth_headers):
    response = client.post("/lists/", json={"name": "Minha Lista"}, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Minha Lista"
    assert not data["is_system"]

def test_favorites_list_is_auto_created(client, auth_headers):
    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]

    response = client.get(f"/lists/user/{user_id}", headers=auth_headers)
    lists: ListType[Dict[str, Any]] = response.json()
    favorites = [lst for lst in lists if lst["name"] == "Favoritos" and lst["is_system"]]
    assert len(favorites) == 1

def test_cannot_delete_system_list(client, auth_headers):
    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]
    lists: ListType[Dict[str, Any]] = client.get(f"/lists/user/{user_id}", headers=auth_headers).json()
    fav = next(lst for lst in lists if lst["is_system"])
    response = client.delete(f"/lists/{fav['id']}", headers=auth_headers)
    assert response.status_code == 403

def test_cannot_rename_system_list(client, auth_headers):
    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]
    lists: ListType[Dict[str, Any]] = client.get(f"/lists/user/{user_id}", headers=auth_headers).json()
    fav = next(lst for lst in lists if lst["is_system"])
    response = client.put(f"/lists/{fav['id']}", json={"name": "Nao Pode"}, headers=auth_headers)
    assert response.status_code == 403

def test_favorite_sync_adds_to_list(client, auth_headers, user_game):
    ug_id = user_game["id"]
    client.put(f"/user-games/{ug_id}", json={"favorite": True}, headers=auth_headers)

    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]
    lists: ListType[Dict[str, Any]] = client.get(f"/lists/user/{user_id}", headers=auth_headers).json()
    fav = next(lst for lst in lists if lst.get("list_type") == "favorites")
    games_in_fav: ListType[Dict[str, Any]] = fav["games"]
    assert len(games_in_fav) == 1
    assert games_in_fav[0]["id"] == user_game["game_id"]

def test_favorite_sync_removes_from_list(client, auth_headers, user_game):
    ug_id = user_game["id"]
    client.put(f"/user-games/{ug_id}", json={"favorite": True}, headers=auth_headers)
    client.put(f"/user-games/{ug_id}", json={"favorite": False}, headers=auth_headers)

    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]
    lists: ListType[Dict[str, Any]] = client.get(f"/lists/user/{user_id}", headers=auth_headers).json()
    fav = next(lst for lst in lists if lst.get("list_type") == "favorites")
    assert len(fav["games"]) == 0

def test_cannot_add_game_manually_to_favorites(client, auth_headers, user_game):
    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]
    lists: ListType[Dict[str, Any]] = client.get(f"/lists/user/{user_id}", headers=auth_headers).json()
    fav = next(lst for lst in lists if lst.get("list_type") == "favorites")

    response = client.post(f"/lists/{fav['id']}/games/{user_game['game_id']}", headers=auth_headers)
    assert response.status_code == 403

def test_delete_list_also_deletes_it_from_ui(auth_headers, client):
    create_resp = client.post("/lists/", json={"name": "Para Apagar"}, headers=auth_headers)
    list_id = create_resp.json()["id"]

    client.delete(f"/lists/{list_id}", headers=auth_headers)

    me = client.get("/users/me", headers=auth_headers)
    user_id = me.json()["id"]
    lists: ListType[Dict[str, Any]] = client.get(f"/lists/user/{user_id}", headers=auth_headers).json()
    assert all(lst["id"] != list_id for lst in lists)