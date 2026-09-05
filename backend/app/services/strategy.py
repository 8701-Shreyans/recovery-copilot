import json
from typing import Dict, Any, Tuple
from ..core.config import settings
from ..schemas.models import DecideRecoveryActionToolOutput

STRATEGY_TOOL_SCHEMA = {
    "name": "decide_recovery_action",
    "description": "Formulate optimal recovery action, execution channel, delay window, and communication message based on case diagnosis and customer profile.",
    "input_schema": {
        "type": "object",
        "properties": {
            "action_type": {
                "type": "string",
                "enum": [
                    "Retry Flow A", "Retry Flow B", "Soft Retry", 
                    "WhatsApp Prompt", "SMS Prompt", "Email Prompt", 
                    "Promise to Pay", "Escalate", "Stand Down"
                ],
                "description": "Selected tactical recovery action"
            },
            "channel": {
                "type": "string",
                "enum": ["GATEWAY", "WHATSAPP", "SMS", "EMAIL", "MANUAL_OPS"],
                "description": "Execution channel"
            },
            "message_body": {
                "type": "string",
                "description": "Drafted communication copy if messaging channel is selected"
            },
            "recommended_delay_hours": {
                "type": "integer",
                "description": "Delay window in hours before triggering action"
            },
            "strategy_rationale": {
                "type": "string",
                "description": "Justification for the chosen action and communication timing"
            }
        },
        "required": ["action_type", "channel", "recommended_delay_hours", "strategy_rationale"]
    }
}

def heuristic_decide_action(case_data: Dict[str, Any], diagnosis_data: Dict[str, Any]) -> DecideRecoveryActionToolOutput:
    """Deterministic recovery strategy selector adhering to fintech operational playbooks."""
    failure_code = case_data.get("failure_code", "ERR_NET")
    amount = case_data.get("amount", 999.0)
    customer_name = case_data.get("customer_name", "Valued Customer")
    first_name = customer_name.split()[0]
    bank = case_data.get("issuing_bank", "Bank")

    if failure_code in ["ERR_NET", "ERR_TIMEOUT"]:
        return DecideRecoveryActionToolOutput(
            action_type="Retry Flow A",
            channel="GATEWAY",
            message_body=None,
            recommended_delay_hours=0,
            strategy_rationale=f"Switch network glitch with {bank}. Rerouting payload immediately through alternate secondary payment switch."
        )

    elif failure_code == "ERR_FUNDS":
        # Check amount: micro-ticket vs larger ticket
        if amount > 5000:
            msg = f"Hi {first_name}, your payment of ₹{amount:,.2f} for your subscription was paused due to temporary bank balance. Click to complete payment or schedule: https://pay.co/p/{case_data.get('transaction_id', 'txn')}"
            return DecideRecoveryActionToolOutput(
                action_type="WhatsApp Prompt",
                channel="WHATSAPP",
                message_body=msg,
                recommended_delay_hours=4,
                strategy_rationale="High-value subscription with insufficient funds; interactive WhatsApp payment prompt sent with 4-hour buffer."
            )
        else:
            return DecideRecoveryActionToolOutput(
                action_type="Retry Flow B",
                channel="GATEWAY",
                message_body=None,
                recommended_delay_hours=12,
                strategy_rationale="Micro-ticket insufficient balance; scheduling automated retry in next 12-hour settlement cycle."
            )

    elif failure_code == "ERR_AUTH":
        msg = f"Namaste {first_name}, your recurring payment of ₹{amount:,.2f} requires quick one-time 2FA approval from {bank}. Please authorize here: https://pay.co/auth/{case_data.get('transaction_id', 'txn')}"
        return DecideRecoveryActionToolOutput(
            action_type="WhatsApp Prompt",
            channel="WHATSAPP",
            message_body=msg,
            recommended_delay_hours=0,
            strategy_rationale="Mandate 2FA step-up required by bank risk engine. Prompting user on WhatsApp with instant verification link."
        )

    elif failure_code == "ERR_LIMIT":
        return DecideRecoveryActionToolOutput(
            action_type="Soft Retry",
            channel="GATEWAY",
            message_body=None,
            recommended_delay_hours=24,
            strategy_rationale="Daily velocity cap reached. Deferring retry by 24 hours for limit reset."
        )

    elif failure_code == "ERR_EXPIRED":
        msg = f"Hello {first_name}, your card on file for ₹{amount:,.2f} has expired. Please update your payment method to avoid service interruption: https://pay.co/update/{case_data.get('customer_id', 'cust')}"
        return DecideRecoveryActionToolOutput(
            action_type="Email Prompt",
            channel="EMAIL",
            message_body=msg,
            recommended_delay_hours=1,
            strategy_rationale="Expired instrument requires card token update via email payment portal."
        )

    elif failure_code == "ERR_FROZEN":
        return DecideRecoveryActionToolOutput(
            action_type="Stand Down",
            channel="MANUAL_OPS",
            message_body=None,
            recommended_delay_hours=0,
            strategy_rationale="Regulatory hard debit freeze on bank account. Automated actions prohibited."
        )

    else:
        return DecideRecoveryActionToolOutput(
            action_type="Escalate",
            channel="MANUAL_OPS",
            message_body=None,
            recommended_delay_hours=0,
            strategy_rationale="Unclassified failure mode requires manual ops intervention."
        )

_gemini_strat_active = True

def decide_recovery_strategy(
    case_data: Dict[str, Any], 
    diagnosis_data: Dict[str, Any]
) -> Tuple[DecideRecoveryActionToolOutput, str]:
    """
    Executes recovery strategy selection using Gemini 2.5 Flash structured tool/JSON, Claude, or deterministic expert engine.
    """
    global _gemini_strat_active

    # 1. Primary: Gemini API
    if _gemini_strat_active and settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("sample-gemini"):
        try:
            import httpx
            prompt = f"""You are Recovery Copilot Strategy Agent.
Given this transaction case and root-cause diagnosis, formulate the best tactical recovery action and respond ONLY in valid JSON matching this schema:
{{
  "action_type": "Retry Flow A" | "Retry Flow B" | "Soft Retry" | "WhatsApp Prompt" | "SMS Prompt" | "Email Prompt" | "Promise to Pay" | "Escalate" | "Stand Down",
  "channel": "GATEWAY" | "WHATSAPP" | "SMS" | "EMAIL" | "MANUAL_OPS",
  "message_body": string or null,
  "recommended_delay_hours": int,
  "strategy_rationale": "Justification for chosen action and communication timing"
}}

Case: {json.dumps(case_data, indent=2)}
Diagnosis: {json.dumps(diagnosis_data, indent=2)}"""

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
                    output = DecideRecoveryActionToolOutput(**data)
                    return output, "gemini-2.5-flash"
                else:
                    _gemini_strat_active = False
        except Exception as e:
            _gemini_strat_active = False
            print(f"[Strategy] Gemini API call failed, falling back: {e}")

    # 2. Secondary: Claude API (Optional)
    if settings.ANTHROPIC_API_KEY and not settings.ANTHROPIC_API_KEY.startswith("sk-ant-api03-sample"):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            prompt = f"""You are Recovery Copilot Strategy Agent.
Given this transaction case and root-cause diagnosis, formulate the best tactical recovery action and invoke `decide_recovery_action`:
Case: {json.dumps(case_data, indent=2)}
Diagnosis: {json.dumps(diagnosis_data, indent=2)}"""

            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                tools=[STRATEGY_TOOL_SCHEMA],
                tool_choice={"type": "tool", "name": "decide_recovery_action"},
                messages=[{"role": "user", "content": prompt}]
            )

            for content in response.content:
                if content.type == "tool_use" and content.name == "decide_recovery_action":
                    output = DecideRecoveryActionToolOutput(**content.input)
                    return output, "claude-3-5-sonnet"
        except Exception as e:
            print(f"[Strategy] Claude API call failed, falling back: {e}")

    # 3. Heuristic Engine (Deterministic Fallback)
    output = heuristic_decide_action(case_data, diagnosis_data)
    return output, "heuristic-rule-engine"
