/**
 * Error normalizado de la capa de proveedores de pago. Nunca debe filtrar el
 * mensaje crudo del proveedor (puede incluir datos internos de la cuenta de
 * Mercado Pago) directamente a una respuesta HTTP pública — el llamador
 * decide qué mensaje mostrar según `code`.
 */
class PaymentProviderError extends Error {
  code:
    | "invalid_signature"
    | "resource_not_found"
    | "resource_mismatch"
    | "provider_request_failed"
    | "provider_unavailable"
    | "invalid_webhook_payload"
    | "not_configured";

  constructor(code: PaymentProviderError["code"], message: string) {
    super(message);
    this.name = "PaymentProviderError";
    this.code = code;
  }
}

export { PaymentProviderError };
