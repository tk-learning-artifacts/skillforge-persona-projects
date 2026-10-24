# Two-sensor line follower, version 4 (final).
# Marcus Lee's robotics CCA, for the micro:bit V2 in MicroPython.
#
# Sensors: two TCRT5000 reflectance boards, analog out. Black tape reads HIGH.
# Motors: a DRV8833 dual H-bridge, powered by its own 4 x AA pack.
# Press A to calibrate and go. Press B at any time to stop.

from microbit import *

# ---- Numbers we tune. Change one per test run, and log it. ----
BASE = 900       # straight-line speed, 0 to 1023
TURN = 700       # how much the inside wheel slows on a turn
LOOP_MS = 30     # pause between readings
SPIN = 400       # wheel speed for the calibration sweep
MIN_GAP = 150    # tape and floor must differ by this much

# ---- Pins. Match these to your wiring diagram. ----
LEFT_EYE = pin1
RIGHT_EYE = pin2
LEFT_PWM, LEFT_DIR = pin8, pin13     # DRV8833 AIN1, AIN2
RIGHT_PWM, RIGHT_DIR = pin16, pin14  # DRV8833 BIN1, BIN2


def set_motor(pwm_pin, dir_pin, speed):
    # speed runs from -1023 (full reverse) to 1023 (full forward).
    # Only one pin of each pair gets PWM, so we never use more than 2 PWM pins.
    speed = max(-1023, min(1023, speed))
    if speed >= 0:
        dir_pin.write_digital(0)
        pwm_pin.write_analog(speed)
    else:
        pwm_pin.write_digital(0)
        dir_pin.write_analog(-speed)


def drive(left, right):
    set_motor(LEFT_PWM, LEFT_DIR, left)
    set_motor(RIGHT_PWM, RIGHT_DIR, right)


def calibrate():
    # Sweep both sensors across the tape: left, right, then back to the middle.
    # Returns the midpoint of the highest and lowest readings, or None.
    low, high = 1023, 0
    for left, right, ms in ((-SPIN, SPIN, 400), (SPIN, -SPIN, 800), (-SPIN, SPIN, 400)):
        drive(left, right)
        start = running_time()
        while running_time() - start < ms:
            for value in (LEFT_EYE.read_analog(), RIGHT_EYE.read_analog()):
                low = min(low, value)
                high = max(high, value)
            sleep(LOOP_MS)
    drive(0, 0)
    if high - low < MIN_GAP:
        return None
    return (low + high) // 2


def follow(threshold):
    # Sense, decide, act, until B is pressed.
    while not button_b.was_pressed():
        left_dark = LEFT_EYE.read_analog() > threshold
        right_dark = RIGHT_EYE.read_analog() > threshold
        if left_dark and not right_dark:
            drive(BASE - TURN, BASE)    # tape under the left sensor: steer left
        elif right_dark and not left_dark:
            drive(BASE, BASE - TURN)    # tape under the right sensor: steer right
        elif not left_dark and not right_dark:
            drive(BASE, BASE)           # tape between the sensors: straight on
        # Both dark: a sharp corner. Keep doing the last thing.
        sleep(LOOP_MS)
    drive(0, 0)


# ---- Main program ----
drive(0, 0)
while True:
    display.show("A")
    while not button_a.was_pressed():
        sleep(20)
    threshold = calibrate()
    if threshold is None:
        display.show(Image.NO)      # not over the tape: move it and press A again
        sleep(1000)
        continue
    display.show(Image.YES)
    sleep(600)
    follow(threshold)
    display.scroll(threshold)       # write this number in the run log
