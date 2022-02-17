def run(context, input):
    return input.map(lambda s: f"consumer got: {s}")

def requires():
    return "pytopic-test"