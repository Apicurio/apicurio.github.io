---
layout: post
title: "The Schema Still Passes: Testing Feature Meaning with Apicurio Registry"
date: 2026-10-23 12:00:00
updated: 2026-10-25
author: carles
categories: registry schemas avro ai
---


A service changes a duration from seconds to milliseconds. Yesterday it sent `30`; today it sends `30000`. The Avro field is still a `long`, serialization succeeds, and the consumer accepts the record. Unfortunately, the consumer still interprets the number as seconds.

This is a useful example of why data contracts need more than schema compatibility. Apicurio Registry can check whether schema versions are compatible. The application also needs a way to check that a value still means what its consumer expects.

We'll build those two checks separately, using a real Registry instance for schema publication and a small deterministic test for the input passed to inference. No model is needed to detect this particular mistake.

## Start with an explicit representation

Our initial Avro schema has both a value and a unit:

```json
{
  "type": "record",
  "name": "Duration",
  "fields": [
    {"name": "duration", "type": "long"},
    {"name": "unit", "type": "string"}
  ]
}
```

The unit is not inferred from the size of the number. A large duration could legitimately be expressed in seconds, so a heuristic such as “divide large values by 1,000” would introduce another ambiguity.

This schema describes the record's structure. It does not restrict `unit` to the values our application understands, and it does not describe the model's expected normalized input. Those requirements will be checked by the application.

## Run the two checks

The example requires Python 3 and Docker Compose:

```bash
git clone https://github.com/carlesarnal/data-contracts-ai-demo.git
cd data-contracts-ai-demo

python3 -m unittest -v
docker compose up -d --wait
python3 demo.py --registry http://localhost:18181
docker compose down -v
```

The integration test creates a unique group in Registry 3.3.3, publishes its schemas and deletes that group afterward. Group deletion is explicitly enabled in the disposable Compose environment so cleanup can succeed.

## Check schema evolution at publication

Registry's v3 artifact API takes the artifact metadata and the first version together. The content field contains the serialized schema:

```python
body = {
    "artifactId": "duration",
    "artifactType": "AVRO",
    "firstVersion": {
        "version": "1",
        "content": {
            "content": json.dumps(schema),
            "contentType": "application/json"
        }
    }
}
```

After creating the artifact, the runner enables a `COMPATIBILITY` rule with `BACKWARD` configuration. This asks whether a reader using the new schema can read data written with the old schema.

Version 2 adds an optional field with a default:

```json
{"name": "source", "type": ["null", "string"], "default": null}
```

That publication succeeds. Version 3 adds a required field without a default:

```json
{"name": "required_new", "type": "string"}
```

Old records have no value for that field, and the new reader has no default to use. Registry rejects the publication with HTTP `400` and a compatibility error. The test then checks that version 3 is absent and version 2 still has exactly its accepted content.

Notice the direction of the guarantee. Protecting an old consumer reading newly produced records is a different reader/writer combination. Choose compatibility policy from your actual upgrade order; “backward-compatible” should not be used as shorthand for every possible producer and consumer combination.

## Check meaning at the feature boundary

Now consider two records that are structurally valid under version 1:

```json
{"duration": 30, "unit": "s"}
```

```json
{"duration": 30000, "unit": "ms"}
```

The inference input should be identical for both. Here is the normalization function used by the example:

```python
def seconds(value, unit):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("duration must be numeric, not boolean")
    if not math.isfinite(value) or value < 0:
        raise ValueError("duration must be finite and nonnegative")
    if unit not in {"s", "ms"}:
        raise ValueError("unit must be explicitly s or ms")
    return value if unit == "s" else value / 1000
```

The central assertion is small:

```python
assert seconds(30, "s") == seconds(30000, "ms") == 30
```

Tests also cover zero, other equivalent representations, missing or unknown units, negative values, non-finite values and booleans. The explicit boolean check matters in Python because `bool` is a subclass of `int`.

This is a test of the transformation used to construct a feature. To protect a real pipeline, run the assertion against the code that the consumer actually invokes—not a second normalization function written only for tests. A fixture that demonstrates the rule is the starting point; wiring it into the production transformation is what makes it an enforcement point.

## Put each check in the right place

| Check | What it protects | What it does not establish |
|---|---|---|
| Registry compatibility rule | Schema publication under a chosen reader/writer policy | Meaning of an unchanged numeric field |
| Serializer integration | Correct use of the selected schema by a producer | Compliance of producers that bypass that integration |
| Feature-input invariant | Expected normalization before inference | Overall predictive quality |

The example's output records successful normalization, an incompatible-publication rejection, absence of the rejected version and preservation of the accepted content. The same Registry and semantic checks also run in its GitHub Actions workflow.

There is deliberately no inference benchmark in this example. We can establish that `30000 ms` must become `30 s` without inventing an accuracy decline or relying on variable model output.

## A practical contract has more than one test

The useful division is not “schema versus no schema.” It is structural compatibility at the publication boundary, followed by domain-specific checks where consumers interpret the data.

Start with a feature whose units, range or category mapping matters. Write two representations that should produce the same consumer input, then one that should be rejected. Keep that fixture beside the transformation and use Registry to govern the schema versions around it. Together, these checks catch failures that neither can cover alone.
