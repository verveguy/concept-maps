import json
import sys

schema = json.load(open('instant-schema.json'))
additions = {
    "entities": schema["entities"],
    "links": schema["links"]
}
print(json.dumps(additions, indent=2))
