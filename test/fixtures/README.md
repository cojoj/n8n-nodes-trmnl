# Test Fixtures

These fixtures contain synthetic request and response data for the TRMNL node
tests. They must not contain API keys, production plugin UUIDs, device IDs,
Webhook headers, or account data.

When an API contract changes, update the smallest applicable fixture. Keep
request assertions and response assertions in different tests.

Plugin Setting, Playlist Item, and Device sleep fixtures use only synthetic IDs,
settings, and safe Liquid text. Keep backup content, production account settings,
and acceptance markers out of the repository.

`errors/` contains synthetic HTTP and network failures. Tests can add a
temporary secret in memory. Node errors and Continue On Fail output must not
contain raw errors.
