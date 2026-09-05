import json
from typing import Dict, Any, Tuple
from ..core.config import settings
from ..schemas.models import ClassifyFailureToolOutput, FeatureAttribution

CLASSIFICATION_TOOL_SCHEMA = {
    "name": "classify_failure",
    "description": "Analyze transaction failure telemetry, bank response codes, retry history, and customer profile to determine root cause and recovery probability.",
    "input_schema": {
        "type": "object",
        "properties": {
            "root_cause": {
                "type": "string",
                "description": "Category or concise title of the root cause"
            },
            "confidence": {
                "type": "string",
                "enum": ["HIGH", "MEDIUM", "LOW"],
                "description": "Diagnosis confidence rating"
            },
            "recoverable_probability": {
                "type": "number",
                "description": "Probability that this failure can be recovered (0.0 to 1.0)"
            },
            "reasoning": {
                "type": "string",
                "description": "Step-by-step diagnostic reasoning based on telemetry signals"
            },
            "feature_attributions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "weight": {"type": "number"},
                        "impact": {"type": "string", "enum": ["positive", "negative"]}
                    },
                    "required": ["name", "weight", "impact"]
                }
            }
        },
        "required": ["root_cause", "confidence", "recoverable_probability", "reasoning", "feature_attributions"]
    }
}

def heuristic_classify_failure(metadata: Dict[str, Any]) -> ClassifyFailureToolOutput:
    """Deterministic, high-fidelity local inference engine used when API keys are not provided or offline."""
    code = metadata.get("failure_code", "ERR_NET")
    bank = metadata.get("issuing_bank", "HDFC Bank")
    retries = metadata.get("retry_count", 0)
    tenure = metadata.get("customer_tenure_days", 180)
    method = metadata.get("payment_method", "UPI AutoPay")

    if code == "ERR_FUNDS":
        prob = max(0.40, 0.92 - (retries * 0.12))
        conf = "HIGH" if retries < 2 else "MEDIUM"
        reasoning = f"Insufficient balance detected on {bank} account. Customer tenure ({tenure} days) indicates loyal account. Recovery probability is strong when scheduled post-payday window."
        features = [
            FeatureAttribution(name="Historical Account Tenure", weight=0.35, impact="positive"),
            FeatureAttribution(name="Prior Retry Attempts", weight=-0.20 if retries > 1 else 0.10, impact="negative" if retries > 1 else "positive"),
            FeatureAttribution(name="Issuer Liquidity Profile", weight=0.25, impact="positive")
        ]
        cause = "Temporary Insufficient Balance (Salary Timing Mismatch)"

    elif code in ["ERR_NET", "ERR_TIMEOUT"]:
        prob = max(0.70, 0.96 - (retries * 0.08))
        conf = "HIGH"
        reasoning = f"Transient switch connectivity timeout observed with {bank} gateway switch. Payload handshake dropped before card debited. Highly recoverable via immediate switch failover."
        features = [
            FeatureAttribution(name="Gateway Network Health", weight=0.48, impact="positive"),
            FeatureAttribution(name="Card Token Validity", weight=0.32, impact="positive"),
            FeatureAttribution(name="Retry Velocity", weight=-0.05, impact="negative")
        ]
        cause = f"Transient Gateway Network Drop / {bank} Switch Latency"

    elif code == "ERR_FROZEN":
        prob = 0.02
        conf = "HIGH"
        reasoning = f"Account locked by compliance / regulatory debit freeze on {bank}. Automated retries prohibited to avoid regulatory escalation. Immediate stand down required."
        features = [
            FeatureAttribution(name="Regulatory Compliance Flag", weight=-0.95, impact="negative"),
            FeatureAttribution(name="Account Status Restricted", weight=-0.80, impact="negative")
        ]
        cause = "Regulatory Hard Debit Freeze / Account Restricted"

    elif code == "ERR_AUTH":
        prob = 0.65 if "UPI" in method else 0.55
        conf = "MEDIUM"
        reasoning = f"Recurring mandate requires explicit customer 2FA step-up re-authorization. Direct automated charge retry will fail without customer interactive consent prompt."
        features = [
            FeatureAttribution(name="Mandate Consent Expiry", weight=-0.40, impact="negative"),
            FeatureAttribution(name="Channel Responsiveness", weight=0.30, impact="positive")
        ]
        cause = "Mandate Step-Up Authentication Required"

    elif code == "ERR_LIMIT":
        prob = 0.78
        conf = "HIGH"
        reasoning = f"Daily velocity / per-transaction limit exceeded on {bank}. Recoverable after midnight cooldown reset window."
        features = [
            FeatureAttribution(name="Daily Velocity Cap", weight=-0.30, impact="negative"),
            FeatureAttribution(name="Account Validity", weight=0.45, impact="positive")
        ]
        cause = "Daily Transaction Velocity Limit Reached"

    else:
        prob = 0.40
        conf = "LOW"
        reasoning = f"Card expired or token authorization revoked. Requires customer payment method update prompt."
        features = [
            FeatureAttribution(name="Token Validity", weight=-0.60, impact="negative")
        ]
        cause = "Payment Instrument Expired / Token Invalid"

    return ClassifyFailureToolOutput(
        root_cause=cause,
        confidence=conf,
        recoverable_probability=round(prob, 2),
        reasoning=reasoning,
        feature_attributions=features
    )

_gemini_active = True

def classify_transaction_failure(metadata: Dict[str, Any]) -> Tuple[ClassifyFailureToolOutput, str]:
    """
    Executes failure classification:
    1. Primary: Gemini 2.5 Flash structured JSON diagnosis if GEMINI_API_KEY is configured.
    2. Optional: Claude 3.5 Sonnet if ANTHROPIC_API_KEY is configured.
    3. Fallback: High-accuracy deterministic heuristic engine.
    """
    global _gemini_active

    # 1. Primary: Gemini API
    if _gemini_active and settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("sample-gemini"):
        try:
            import httpx
            prompt = f"""You are Recovery Copilot, an expert fintech payment operations diagnosis agent.
Analyze this failed payment telemetry and respond ONLY in valid JSON matching this schema:
{{
  "root_cause": "Category or concise title of root cause",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "recoverable_probability": float (0.0 to 1.0),
  "reasoning": "Step-by-step diagnostic reasoning",
  "feature_attributions": [
    {{"name": "string", "weight": float, "impact": "positive" | "negative"}}
  ]
}}

Telemetry:
{json.dumps(metadata, indent=2)}"""

            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            with httpx.Client(timeout=3.5) as client:
                res = client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}",
                    json=payload
                )
                if res.status_code == 200:
                    raw_data = res.json()
                    text_content = raw_data["candidates"][0]["content"]["parts"][0]["text"]
                    data = json.loads(text_content)
                    output = ClassifyFailureToolOutput(**data)
                    return output, "gemini-2.5-flash"
                else:
                    _gemini_active = False
        except Exception as e:
            _gemini_active = False
            print(f"[Classifier] Gemini API call failed, falling back: {e}")

    # 2. Secondary: Claude API (Optional)
    if settings.ANTHROPIC_API_KEY and not settings.ANTHROPIC_API_KEY.startswith("sk-ant-api03-sample"):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            prompt = f"""You are Recovery Copilot, an expert fintech payment operations diagnosis agent.
Analyze this failed payment telemetry and invoke the `classify_failure` tool:
{json.dumps(metadata, indent=2)}"""

            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                tools=[CLASSIFICATION_TOOL_SCHEMA],
                tool_choice={"type": "tool", "name": "classify_failure"},
                messages=[{"role": "user", "content": prompt}]
            )

            for content in response.content:
                if content.type == "tool_use" and content.name == "classify_failure":
                    output = ClassifyFailureToolOutput(**content.input)
                    return output, "claude-3-5-sonnet"
        except Exception as e:
            print(f"[Classifier] Claude API call failed, falling back: {e}")

    # 3. Heuristic Engine (Deterministic Fallback)
    output = heuristic_classify_failure(metadata)
    return output, "heuristic-rule-engine"
