# Kotak, the shy cardboard robot. Version 3 (final).
# Mei Ling's P5 coding club. micro:bit V2, MicroPython.
#
# It drives forward. When something is close, it stops, backs away,
# turns a random way, and carries on.
# Press A to start. Press B to stop.

from microbit import *
import machine
import utime
import random

# ---- Pupils may change these ----
STOP_CM = 15      # stop when something is this close (cm)
SPEED = 15        # how fast: 0 is stopped, 25 is about full speed
BACK_MS = 300     # how long to back away (ms)
TURN_MS = 500     # how long to turn (ms)

# ---- Only the teacher changes these ----
LEFT_STOP = 78    # servo value where the left wheel stands still
RIGHT_STOP = 75   # servo value where the right wheel stands still
FAR = 400         # what we use when no echo comes back (cm)

TRIG = pin1       # sensor trigger
ECHO = pin2       # sensor echo
LEFT = pin8       # left servo signal
RIGHT = pin16     # right servo signal

# Servos want a pulse every 20 ms.
LEFT.set_analog_period(20)
RIGHT.set_analog_period(20)


def wheels(left, right):
    # Plus is forward for each wheel. The right servo faces the other way,
    # so its number goes down to go forward.
    LEFT.write_analog(LEFT_STOP + left)
    RIGHT.write_analog(RIGHT_STOP - right)


def ping():
    # One shout. Returns cm, or -1 if no echo came back in 30 ms.
    TRIG.write_digital(1)
    utime.sleep_us(10)
    TRIG.write_digital(0)
    t = machine.time_pulse_us(ECHO, 1, 30000)
    if t < 0:
        return -1
    return t / 58


def distance():
    # Shout three times. Ignore the shouts with no echo.
    # Take the middle answer of the ones left.
    heard = []
    for i in range(3):
        d = ping()
        if d >= 0:
            heard.append(d)
        sleep(60)
    if len(heard) == 0:
        return FAR
    heard.sort()
    return heard[(len(heard) - 1) // 2]


# ---- Main program ----
wheels(0, 0)
display.show(Image.ASLEEP)
while not button_a.was_pressed():
    sleep(20)

while not button_b.was_pressed():
    d = distance()                      # sense
    if d > STOP_CM:                     # decide
        display.show(Image.HAPPY)
        wheels(SPEED, SPEED)            # act: carry on
    else:
        display.show(Image.SURPRISED)
        wheels(0, 0)                    # act: stop,
        sleep(200)
        wheels(-SPEED, -SPEED)          # back away,
        sleep(BACK_MS)
        turn = random.choice([-1, 1])   # and turn left or right
        wheels(SPEED * turn, -SPEED * turn)
        sleep(TURN_MS)

wheels(0, 0)
display.show(Image.ASLEEP)
