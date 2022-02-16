def run(context, input):
    return input.map(lambda s: f"producer got: {s}")

def provides():
    return "pytopic-test"
