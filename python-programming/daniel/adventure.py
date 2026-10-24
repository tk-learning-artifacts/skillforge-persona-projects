# Lost in the Lab: a binary text adventure
# Daniel Ong, for my Sec 2 coding class

items = []
codes = {"lab": "0110", "server": "1101", "exit": "00101101"}
moves = 0


def to_denary(bits):
    total = 0
    place = 2 ** (len(bits) - 1)
    for bit in bits:
        if bit == "1":
            total = total + place
        place = place // 2
    return total


def keypad(door):
    code = codes[door]
    print("The keypad shows " + code + ".")
    guess = input("Type the number in denary: ")
    if guess.strip() == str(to_denary(code)):
        print("Click. The door opens.")
        return True
    print("Beep. Wrong number. The door stays shut.")
    return False


def ask(exits):
    while True:
        choice = input("> ").lower().strip()
        if choice in exits:
            return choice
        elif choice == "items":
            if len(items) == 0:
                print("You are carrying nothing.")
            else:
                print("You are carrying: " + ", ".join(items))
        elif choice == "card":
            if "card" in items:
                print("Place values: 128 64 32 16 8 4 2 1")
            else:
                print("You do not have a card.")
        else:
            print("Try: " + ", ".join(exits) + ", items or card")


def corridor():
    print("\nCORRIDOR. The lights are off. Doors lead to the STORE and the LAB.")
    choice = ask(["store", "lab"])
    if choice == "lab" and not keypad("lab"):
        return "corridor"
    return choice


def store():
    print("\nSTORE. Boxes of old cables and a torch.")
    if "torch" not in items:
        items.append("torch")
        print("You take the torch.")
    print("Nothing else here. You go back to the corridor.")
    return "corridor"


def lab():
    print("\nLAB. Forty laptops sleep on the desks. A door says SERVER.")
    if "card" not in items:
        items.append("card")
        print("A card on the teacher's desk lists place values. You take it.")
        print("(Type card at any time to read it.)")
    choice = ask(["corridor", "server"])
    if choice == "server" and not keypad("server"):
        return "lab"
    return choice


def server():
    if "torch" not in items:
        print("\nSERVER ROOM. It is pitch dark. You feel your way back out.")
        return "lab"
    print("\nSERVER ROOM. Your torch finds the EXIT door. Its keypad is longer.")
    choice = ask(["exit", "lab"])
    if choice == "exit" and keypad("exit"):
        return "outside"
    return "server"


print("You stayed late to finish your code. Now the school is locked.")
print("Find your way OUT. Type items to see what you carry.")
room = "corridor"
while room != "outside":
    moves = moves + 1
    if room == "corridor":
        room = corridor()
    elif room == "store":
        room = store()
    elif room == "lab":
        room = lab()
    elif room == "server":
        room = server()
print("\nYou are outside. You escaped in", moves, "moves.")
