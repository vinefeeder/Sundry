# A routine to control a group or groups of Outdoor Philips Hue lamps - typically Porch loghts
# uses Hue API version 1
#
# Synology version:
# - replaces sunwait with an internal sunset calculation
# - replaces httpx with requests
# - otherwise preserves the working Pi control logic


# The transition is along an imaginary circle's edge with radius and centre specified to fall
# within the Philips Gamut C triangle on their Chromacity diagram.

# See https://developers.meethue.com/develop/get-started-2/ free registration and login required
# see https://developers.meethue.com/wp-content/uploads/2018/02/color.png for chromacity diagram
# setting Hue to any pair of xy values for any point within the chromacity Gamut C diagram will change
# the lamp colour to that at the xy point.

# This routine uses a proximity sensor to brighten the light if persons or animals are detected in range

# it is designd to be run by Synology Task Manager.
# No non-stndard Python modules are required.

###############################
# Gamut C corners for reference
###############################
# Red: 0.6915, 0.3038
# Green: 0.17, 0.7
# Blue: 0.1532, 0.0475


import math
import threading
import time
from datetime import datetime, date, timedelta, timezone

import requests


# ----------------------------------------------------------------------
# SUNSET CONFIGURATION
# ----------------------------------------------------------------------

# Location previously used by sunwait:
# 50.78278N 0.092222E
LATITUDE = 50.78278
LONGITUDE = 0.092222


def sunset_time(day=None):
    """
    Calculate local sunset time for the configured latitude/longitude.

    Uses the standard sunset zenith of 90.833 degrees, allowing for
    atmospheric refraction and the apparent radius of the Sun.

    The returned time is converted to the Synology NAS's configured
    local timezone, so DSM should be set to the correct UK timezone.
    """

    if day is None:
        day = datetime.now().date()

    day_number = day.timetuple().tm_yday
    longitude_hour = LONGITUDE / 15.0

    t = day_number + ((18 - longitude_hour) / 24.0)
    mean_anomaly = (0.9856 * t) - 3.289

    true_longitude = (
        mean_anomaly
        + 1.916 * math.sin(math.radians(mean_anomaly))
        + 0.020 * math.sin(math.radians(2 * mean_anomaly))
        + 282.634
    ) % 360

    right_ascension = math.degrees(
        math.atan(0.91764 * math.tan(math.radians(true_longitude)))
    ) % 360

    longitude_quadrant = math.floor(true_longitude / 90) * 90
    ascension_quadrant = math.floor(right_ascension / 90) * 90
    right_ascension += longitude_quadrant - ascension_quadrant
    right_ascension /= 15.0

    sin_declination = 0.39782 * math.sin(math.radians(true_longitude))
    cos_declination = math.cos(math.asin(sin_declination))

    zenith = 90.833

    cos_hour_angle = (
        math.cos(math.radians(zenith))
        - sin_declination * math.sin(math.radians(LATITUDE))
    ) / (
        cos_declination * math.cos(math.radians(LATITUDE))
    )

    if cos_hour_angle < -1 or cos_hour_angle > 1:
        raise RuntimeError("No sunset occurs on this date at this latitude.")

    hour_angle = math.degrees(math.acos(cos_hour_angle))
    hour_angle /= 15.0

    local_mean_time = (
        hour_angle
        + right_ascension
        - (0.06571 * t)
        - 6.622
    )

    utc_hour = (local_mean_time - longitude_hour) % 24

    sunset_utc = datetime(
        day.year,
        day.month,
        day.day,
        tzinfo=timezone.utc,
    ) + timedelta(hours=utc_hour)

    return sunset_utc


def wait_for_sunset():
    sunset = sunset_time()
    now = datetime.now(timezone.utc)

    print(f"Today's sunset: {sunset:%Y-%m-%d %H:%M:%S %Z}")

    if now >= sunset:
        print("Sunset has already occurred; starting immediately.")
        return

    wait_seconds = (sunset - now).total_seconds()

    print(f"Waiting for sunset ({wait_seconds / 3600:.2f} hours).")
    time.sleep(wait_seconds)



# ----------------------------------------------------------------------
# HUE CONFIGURATION
# ----------------------------------------------------------------------

username = "Za8ro1pOtZOxz9yukG15wI82QeY4SZ2Vnz8jBoZr"

# NOTE: this uses the bridge IP supplied for the Synology version.
bridge_IP_address = "192.168.178.35"

group1 = 83
action1 = f"http://{bridge_IP_address}/api/{username}/groups/{group1}/action"
sensorstatus = f"http://{bridge_IP_address}/api/{username}/sensors/38"


# ----------------------------------------------------------------------
# CONTROL CONFIGURATION
# ----------------------------------------------------------------------

NORMAL_BRIGHTNESS = 192
SENSORTIMEOUT = 150
TIMEINTERVAL = 5
TRANSITIONTIME = 10
ITEMS = 180
HOURSBEFOREMIDNIGHT = 2
r = 0.25


# ----------------------------------------------------------------------
# SHARED STATE
# ----------------------------------------------------------------------

stop_event = threading.Event()
pause_event = threading.Event()
bri_lock = threading.Lock()
bri = NORMAL_BRIGHTNESS

# ----------------------------------------------------------------------
# cope with BST on a machine running GMT
# ----------------------------------------------------------------------
# On machines that change automatically to BST, the following definition
# for wait_for_sunset is needed.
'''def is_time_to_stop():
    midnight = datetime.combine(date.today(), datetime.min.time()) + timedelta(days=1)
    stop_time = midnight - timedelta(hours=HOURSBEFOREMIDNIGHT)
    return datetime.now() >= stop_time'''

# on machines that do not change automatically to BST, the following three definitions
# fist detect BST, then calculate the stop time in UTC, and finally compare the current UTC time to the stop time.
def last_sunday(year, month):
    """Return the date of the last Sunday in a month."""
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    last_day = next_month - timedelta(days=1)

    return last_day - timedelta(days=(last_day.weekday() + 1) % 7)


def is_bst(day):
    """True when the supplied date falls within UK British Summer Time."""
    bst_start = last_sunday(day.year, 3)
    bst_end = last_sunday(day.year, 10)

    return bst_start <= day < bst_end


def is_time_to_stop():
    now = datetime.now(timezone.utc)
    today = now.date()

    # 22:00 UK time is:
    #   21:00 UTC during BST
    #   22:00 UTC during GMT
    stop_hour_utc = 21 if is_bst(today) else 22

    stop_time = datetime(
        today.year,
        today.month,
        today.day,
        stop_hour_utc,
        tzinfo=timezone.utc,
    )

    return now >= stop_time
# ---------------------------  end GMT machine -------------------------------

def sensor_thread():
    """Monitor motion sensor and halt the main thread during motion detection."""
    global bri

    while not stop_event.is_set():
        try:
            response = client.get(sensorstatus, timeout=100)
            myjson = response.json()

            if myjson["state"]["presence"]:
                print(f"Motion detected at {datetime.now()}, pausing color changes.")

                pause_event.set()

                with bri_lock:
                    bri = 254

                myjson = {
                    "on": True,
                    "bri": bri,
                    "xy": [0.3, 0.35],
                }

                client.put(action1, json=myjson, timeout=100)

                time.sleep(SENSORTIMEOUT)

                print(
                    f"Resuming color changes at {datetime.now()} in sensor thread."
                )

                with bri_lock:
                    bri = NORMAL_BRIGHTNESS

                pause_event.clear()

        except Exception as e:
            print(f"Sensor thread error: {e}")

        time.sleep(1)


def main_thread():
    """Calculate and send color updates to the Hue bulb."""
    global bri

    print(f"Script started at {datetime.now()}")

    myjson = {
        "on": True,
        "bri": NORMAL_BRIGHTNESS,
    }

    try:
        client.put(action1, json=myjson, timeout=100)
    except Exception as e:
        print(f"Error turning on lights: {e}")

    i = 1

    while True:
        if is_time_to_stop():
            print(f"Stopping script at {datetime.now()}")

            myjson = {"on": False}

            try:
                client.put(action1, json=myjson, timeout=100)
            except Exception as e:
                print(f"Error turning off lights: {e}")

            stop_event.set()
            return

        if pause_event.is_set():
            print("Main thread paused due to motion detection.")

            while pause_event.is_set():
                pause_event.wait(2)

            print(
                f"Resuming color changes at {datetime.now()} in main thread."
            )

        x = round(
            0.33 + r * math.cos(2 * math.pi * i / ITEMS),
            4,
        )
        y = round(
            0.37 + r * math.sin(2 * math.pi * i / ITEMS),
            4,
        )

        with bri_lock:
            myjson = {
                "on": True,
                "bri": bri,
                "xy": [x, y],
                "transitiontime": TRANSITIONTIME,
            }

        try:
            response = client.put(action1, json=myjson, timeout=100)

            if response.status_code != 200:
                print(f"Command failed: {response.status_code}")

        except Exception as e:
            print(f"Error updating lights: {e}")

        time.sleep(TIMEINTERVAL)

        i += 1

        if i >= ITEMS:
            i = 1


def main():
    global client

    client = requests.Session()

    sensor = threading.Thread(target=sensor_thread, daemon=True)
    main_color = threading.Thread(target=main_thread, daemon=True)

    sensor.start()
    main_color.start()

    sensor.join()
    main_color.join()


if __name__ == "__main__":
    wait_for_sunset()
    main()
