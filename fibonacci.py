def fibonacci(n: int) -> list[int]:
    if n <= 0:
        return []
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

if __name__ == "__main__":
    sequence = fibonacci(20)
    for i, val in enumerate(sequence, 1):
        print(f"F({i - 1}) = {val}")
