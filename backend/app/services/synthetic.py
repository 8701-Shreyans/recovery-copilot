import random
import uuid
from typing import List, Dict, Any
from ..core.security import mask_phone, mask_email, hash_identifier

INDIAN_BANKS = [
    "HDFC Bank", "ICICI Bank", "State Bank of India", 
    "Axis Bank", "Kotak Mahindra Bank", "Federal Bank", "Yes Bank"
]

PAYMENT_METHODS = [
    "UPI AutoPay", "Visa Debit Card", "Mastercard Credit", 
    "eNACH Mandate", "RuPay Debit", "Corporate Amex"
]

FAILURE_MODES = [
    {
        "code": "ERR_FUNDS",
        "desc": "Insufficient funds in customer account for recurring mandate sweep",
        "base_prob": 0.88,
        "default_root_cause": "Temporary Insufficient Balance (Salary Cycle Mismatch)"
    },
    {
        "code": "ERR_NET",
        "desc": "Gateway switch network drop during issuer transaction handshake",
        "base_prob": 0.94,
        "default_root_cause": "Transient Switch Latency / Gateway Socket Error"
    },
    {
        "code": "ERR_TIMEOUT",
        "desc": "Issuer bank authorization switch timed out after 30000ms",
        "base_prob": 0.91,
        "default_root_cause": "Issuer Core Banking Switch Timeout"
    },
    {
        "code": "ERR_AUTH",
        "desc": "Recurring mandate 2FA step-up required by issuer risk engine",
        "base_prob": 0.65,
        "default_root_cause": "Mandate Step-Up Challenge / Expired Consent"
    },
    {
        "code": "ERR_FROZEN",
        "desc": "Account locked by regulatory compliance order / debit freeze active",
        "base_prob": 0.04,
        "default_root_cause": "Regulatory Hard Debit Freeze / Account Restricted"
    },
    {
        "code": "ERR_EXPIRED",
        "desc": "Card expiration date passed / token authorization revoked",
        "base_prob": 0.35,
        "default_root_cause": "Card Expiry / Token De-registration"
    },
    {
        "code": "ERR_LIMIT",
        "desc": "Daily UPI / Debit transaction velocity limit reached on customer account",
        "base_prob": 0.72,
        "default_root_cause": "Daily Velocity / Single-Transaction Threshold Exceeded"
    }
]

INDIAN_NAMES = [
    "Aarav Sharma", "Priya Patel", "Rohan Mehta", "Ananya Iyer", "Vikram Singh",
    "Deepika Verma", "Rahul Deshmukh", "Sneha Nair", "Aditya Kulkarni", "Neha Reddy",
    "Karan Malhotra", "Pooja Banerjee", "Siddharth Sen", "Meera Joshi", "Gaurav Gupta",
    "Tanvi Rao", "Arjun Choudhury", "Divya Menon", "Manish Saxena", "Kavita Pillai"
]

def generate_synthetic_transactions(count: int = 50, scenario_id: str = "baseline") -> List[Dict[str, Any]]:
    """
    Generates a realistic batch of failed transaction cases with Indian fintech context.
    Supports scenario-driven distribution shifts (e.g. salary weekend, switch outages).
    """
    transactions = []
    
    for i in range(count):
        txn_index = 1000 + i
        txn_id = f"TXN-{txn_index}-{uuid.uuid4().hex[:4].upper()}"
        case_id = f"CASE-{txn_index}-{uuid.uuid4().hex[:4].upper()}"
        cust_id = f"CUST-{random.randint(1000, 9999)}"
        
        name = random.choice(INDIAN_NAMES)
        first_lower = name.split()[0].lower()
        raw_phone = f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}"
        raw_email = f"{first_lower}.{random.randint(10, 99)}@example.com"
        
        # Determine failure code & bank based on scenario
        bank = random.choice(INDIAN_BANKS)
        payment_method = random.choice(PAYMENT_METHODS)
        
        if scenario_id == "hdfc_degraded" and random.random() < 0.65:
            bank = "HDFC Bank"
            failure = random.choice([f for f in FAILURE_MODES if f["code"] in ["ERR_NET", "ERR_TIMEOUT"]])
        elif scenario_id == "salary_weekend" and random.random() < 0.7:
            failure = next(f for f in FAILURE_MODES if f["code"] == "ERR_FUNDS")
        elif scenario_id == "upi_outage" and random.random() < 0.7:
            payment_method = "UPI AutoPay"
            failure = random.choice([f for f in FAILURE_MODES if f["code"] in ["ERR_NET", "ERR_TIMEOUT"]])
        elif scenario_id == "strict_compliance" and random.random() < 0.4:
            failure = next(f for f in FAILURE_MODES if f["code"] == "ERR_FROZEN")
        else:
            # Baseline distribution
            failure = random.choice(FAILURE_MODES)

        # Amounts vary from ₹199 micro-subscriptions up to ₹45,000 SaaS/EMI charges
        amount_tier = random.choices(
            [499, 999, 1499, 2999, 4999, 8500, 12500, 24000, 48000],
            weights=[25, 25, 15, 15, 10, 5, 3, 1, 1]
        )[0]
        amount = float(amount_tier) + round(random.random() * 0.99, 2)
        
        retry_count = random.choices([0, 1, 2, 3, 4], weights=[50, 25, 15, 7, 3])[0]
        tenure_days = random.randint(15, 730)
        
        # Inject opt-out flag for 5% of cases to test compliance guardrails
        is_opted_out = random.random() < 0.06

        transactions.append({
            "case_id": case_id,
            "transaction_id": txn_id,
            "customer_id": cust_id,
            "customer_name": name,
            "customer_phone": raw_phone,
            "customer_email": raw_email,
            "customer_phone_masked": mask_phone(raw_phone),
            "customer_email_masked": mask_email(raw_email),
            "phone_hash": hash_identifier(raw_phone),
            "email_hash": hash_identifier(raw_email),
            "amount": amount,
            "currency": "INR",
            "payment_method": payment_method,
            "issuing_bank": bank,
            "failure_code": failure["code"],
            "failure_raw_desc": failure["desc"],
            "default_root_cause": failure["default_root_cause"],
            "base_recoverability": failure["base_prob"],
            "retry_count": retry_count,
            "customer_tenure_days": tenure_days,
            "is_opted_out": is_opted_out,
            "is_account_frozen": failure["code"] == "ERR_FROZEN"
        })
        
    return transactions
