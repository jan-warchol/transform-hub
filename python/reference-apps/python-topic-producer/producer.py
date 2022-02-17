def run(context, input):
    return input.map(lambda s: f"producer got: {s}").each(print)

def provides():
    return "pytopic-test"
