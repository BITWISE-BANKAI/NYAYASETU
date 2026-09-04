import os
from cryptography.fernet import Fernet
from core.config import settings

# Usually this should be a secure environment variable. 
# We'll generate one here for demonstration if not provided in settings.
ENCRYPTION_KEY = os.getenv("EVIDENCE_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generates a key if missing. In production, this must be persistent and secret.
    ENCRYPTION_KEY = Fernet.generate_key().decode('utf-8')

fernet = Fernet(ENCRYPTION_KEY.encode('utf-8'))

def encrypt_file_data(data: bytes) -> bytes:
    """Encrypts raw file bytes using symmetric encryption."""
    return fernet.encrypt(data)

def decrypt_file_data(encrypted_data: bytes) -> bytes:
    """Decrypts symmetrically encrypted file bytes."""
    return fernet.decrypt(encrypted_data)

def save_encrypted_file(file_path: str, data: bytes):
    """Encrypts and saves data to disk."""
    encrypted_data = encrypt_file_data(data)
    with open(file_path, "wb") as f:
        f.write(encrypted_data)

def read_encrypted_file(file_path: str) -> bytes:
    """Reads and decrypts data from disk."""
    with open(file_path, "rb") as f:
        encrypted_data = f.read()
    return decrypt_file_data(encrypted_data)
