// Part6InteroperabilityService: the documented integration contract in one place.
//
//   Patient ID -> FHIR Mapping Layer -> FHIR Resource -> Consent Check -> Authorization Check
//              -> Secure Data Exchange -> Audit Log
//
// It is a thin facade over the focused services so an embedding application has a single entry point.
export function createInteroperabilityService(services) {
  const { fhir, consent, share, identity, security, audit, overview, settings } = services;
  return {
    fhir,
    consent,
    share,
    identity,
    security,
    audit,
    overview,
    settings,
    /** Consent-gated exchange: authorisation + consent + scope are enforced inside share.execute. */
    exchange: (user, input, req) => share.execute(user, input, req),
  };
}
