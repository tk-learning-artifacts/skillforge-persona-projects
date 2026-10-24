# Starter: one locked door
def to_denary(bits):
    total = 0
    place = 2 ** (len(bits) - 1)
    for bit in bits:
        if bit == "1":
            total = total + place
        place = place // 2
    return total


code = "0110"
answer = to_denary(code)
wrong = []
print("The lab door has a keypad. It shows", code)
guess = input("Type the number in denary: ")
while guess != str(answer):
    wrong.append(guess)
    print("Beep. Try again.")
    guess = input("Type the number in denary: ")
print("Click. The door opens.")
print("Wrong guesses:", wrong)
