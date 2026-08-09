# Test Fixtures

These fixtures are synthetic, redacted examples of the response and request shapes used by
the TRMNL node tests. They must not contain real API keys, plugin UUIDs, device identifiers,
webhook headers, or account data.

When an API contract changes, update the smallest relevant fixture and keep assertions for
the request sent by the node separate from assertions for the response it returns.

Plugin Setting, Playlist Item, and Device sleep fixtures use synthetic identifiers, settings,
and harmless Liquid snippets only. Live backup content, original account settings, and acceptance
markers must remain outside the repository.

`errors/` contains fully redacted representative HTTP and network failures. Tests may add an
in-memory sentinel secret to prove that raw upstream errors never reach node errors or Continue
On Fail output.
