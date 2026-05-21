from flask import request


def get_json_payload():
    """Parse JSON request body, returning an empty dict on failure."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}
