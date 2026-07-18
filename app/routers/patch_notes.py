from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.patch_note import PatchNote
from app.models.user import User
from app.schemas.patch_note import PatchNoteCreate, PatchNoteResponse, PatchNoteUpdate
from app.security import get_current_admin, get_current_user

router = APIRouter(prefix="/patch-notes", tags=["Patch Notes"])


@router.get("", response_model=List[PatchNoteResponse])
def list_patch_notes(db: Session = Depends(get_db)):
    """Retorna todas as notas de atualização ordenadas decrescentemente por data de criação."""
    return (
        db.query(PatchNote)
        .options(joinedload(PatchNote.author))
        .order_by(PatchNote.created_at.desc())
        .all()
    )


@router.get("/unread")
def check_unread_patches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verifica se existem notas de atualização não lidas pelo usuário."""
    latest_patch = db.query(PatchNote).order_by(PatchNote.created_at.desc()).first()
    if not latest_patch:
        return {"unread": False}

    if not current_user.last_read_patches_at:
        return {"unread": True}

    # Compara a data de criação do último patch com a data de leitura do usuário
    return {"unread": latest_patch.created_at > current_user.last_read_patches_at}


@router.post("/read")
def mark_patches_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca todos os patch notes como lidos atualizando last_read_patches_at do usuário."""
    current_user.last_read_patches_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"message": "Patch notes marcadas como lidas."}


@router.post("", response_model=PatchNoteResponse, status_code=status.HTTP_201_CREATED)
def create_patch_note(
    patch_in: PatchNoteCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Cria um novo patch note (apenas administradores)."""
    new_patch = PatchNote(
        title=patch_in.title,
        content=patch_in.content,
        author_id=admin.id,
    )
    db.add(new_patch)
    db.commit()
    db.refresh(new_patch)

    # Recarrega o patch com o relacionamento carregado
    return (
        db.query(PatchNote)
        .options(joinedload(PatchNote.author))
        .filter(PatchNote.id == new_patch.id)
        .first()
    )


@router.put("/{patch_id}", response_model=PatchNoteResponse)
def update_patch_note(
    patch_id: str,
    patch_in: PatchNoteUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Atualiza um patch note existente (apenas administradores)."""
    patch = db.query(PatchNote).filter(PatchNote.id == patch_id).first()
    if not patch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patch note não encontrado.",
        )

    patch.title = patch_in.title
    patch.content = patch_in.content
    patch.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    db.refresh(patch)

    return (
        db.query(PatchNote)
        .options(joinedload(PatchNote.author))
        .filter(PatchNote.id == patch.id)
        .first()
    )


@router.delete("/{patch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patch_note(
    patch_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Exclui um patch note permanentemente (apenas administradores)."""
    patch = db.query(PatchNote).filter(PatchNote.id == patch_id).first()
    if not patch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patch note não encontrado.",
        )

    db.delete(patch)
    db.commit()
    return None
