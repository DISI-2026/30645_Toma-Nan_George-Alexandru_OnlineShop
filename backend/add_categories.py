import asyncio
import sys
from pathlib import Path

# Adaugă calea către src în sys.path
backend_root = Path(__file__).parent
src_path = backend_root / "src"
sys.path.insert(0, str(src_path))

from sqlalchemy import select
from backend.db import connect, disconnect
from models import Category


async def add_categories():
    engine, session_factory = connect()
    
    try:
        async with session_factory() as session:
            # Verifică dacă există deja categorii
            result = await session.execute(select(Category))
            existing = result.scalars().all()
            
            if existing:
                print(f"Există deja {len(existing)} categorii în baza de date:")
                for cat in existing:
                    print(f"  - {cat.name} (ID: {cat.id})")
                return
            
            # Adaugă categoriile
            categories = [
                Category(name="Electronice", description="Produse electronice și gadgeturi", slug="electronice"),
                Category(name="Îmbrăcăminte", description="Haine și accesorii vestimentare", slug="imbracaminte"),
                Category(name="Casă & Grădină", description="Produse pentru casă și grădină", slug="casa-gradina"),
                Category(name="Sport", description="Echipamente și accesorii sportive", slug="sport"),
                Category(name="Cărți", description="Cărți și publicații", slug="carti"),
            ]
            
            session.add_all(categories)
            await session.commit()
            
            print(f"✅ Au fost adăugate {len(categories)} categorii cu succes!")
            for cat in categories:
                print(f"  - {cat.name} (ID: {cat.id})")
    
    finally:
        await disconnect(engine)


if __name__ == "__main__":
    asyncio.run(add_categories())
