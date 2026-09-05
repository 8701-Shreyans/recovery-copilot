import hashlib
import re

def hash_identifier(value: str) -> str:
    """Computes deterministic SHA-256 hash for phone or email for zero-knowledge opt-out lookups."""
    if not value:
        return ""
    normalized = value.strip().lower()
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

def mask_phone(phone: str) -> str:
    """Masks Indian/international phone numbers showing only country code and last 3-4 digits."""
    if not phone:
        return ""
    clean = re.sub(r'[\s\-\(\)]', '', phone)
    if len(clean) >= 10:
        prefix = clean[:3] if clean.startswith('+') else clean[:2]
        suffix = clean[-3:]
        return f"{prefix} •••• ••• {suffix}"
    return "•••• ••••"

def mask_email(email: str) -> str:
    """Masks email address showing only initial character and domain."""
    if not email or '@' not in email:
        return ""
    user, domain = email.split('@', 1)
    if len(user) <= 2:
        masked_user = user[0] + "***"
    else:
        masked_user = user[0] + "***" + user[-1]
    return f"{masked_user}@{domain}"

def mask_card_number(card: str) -> str:
    """Masks card number showing only last 4 digits."""
    if not card:
        return ""
    clean = re.sub(r'\D', '', card)
    if len(clean) >= 4:
        return f"•••• •••• •••• {clean[-4:]}"
    return "•••• •••• •••• 4242"
