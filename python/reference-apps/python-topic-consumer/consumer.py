def run(context, input):
    return input.map(lambda s: f"consumer got: {s}").each(print)

def requires():
    return "pytopic-test"