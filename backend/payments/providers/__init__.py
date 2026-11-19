from .airwallex import AirwallexProvider

PROVIDERS = {AirwallexProvider.code: AirwallexProvider}


def get_provider(code):
    """Le prestataire `code` s'il est configuré, sinon None."""
    cls = PROVIDERS.get(code)
    provider = cls() if cls else None
    return provider if provider and provider.is_configured() else None


def configured_providers():
    return [code for code in PROVIDERS if get_provider(code)]
