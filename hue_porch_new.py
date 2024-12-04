# A routine to control a group or groups of Philips Hue lamps
# uses Hue API version 1 

# The transition is along an imaginary circle's edge with radius and centre specified to fall
# within the Philips Gamut C triangle on their Chromacity diagram.

# See https://developers.meethue.com/develop/get-started-2/ free registration and login required
# see https://developers.meethue.com/wp-content/uploads/2018/02/color.png for chromacity diagram
# setting Hue to any pair of xy values for any point within the chromacity Gamut C diagram will change
# the lamp colour to that at the xy point.

# This routine uses a proximity sensor to brighten the light if persons or animals are detected in range

# it is designd to be run by cron at sunset.  crontab and sunwait are required
###############################
# Gamut C corners for reference
###############################
# Red: 0.6915, 0.3038
# Green: 0.17, 0.7
# Blue: 0.1532, 0.0475




from httpx import Client
import time
import math
from datetime import datetime, date, timedelta
import threading
import json


# Hue configuration
username = 'Za8ro1pOtZOxz9yukG15wI82QeY4SZ2Vnz8jBoZr'
bridge_IP_address = '192.168.1.125'

# LIGHT GROUP(S)
# define which groups to control; specify a group number; for all lights on the bridge, use group 0
# See your bridge data for group numbers. http://<bridge-ip-address>/api/<username>
# Indivdual lights (single lamp) may be addressed by http://<bridge-ip-address>/api/<username>/lights/<number>/state
# Individual groups (zone) may be accessed by http://<bridge-ip-address>/api/<username>/groups/<number>/action
group1 = 83
action1 = f"http://{bridge_IP_address}/api/{username}/groups/{group1}/action"
sensorstatus = f"http://{bridge_IP_address}/api/{username}/sensors/38"

# Configuration
NORMAL_BRIGHTNESS = 128
SENSORTIMEOUT = 150
TIMEINTERVAL = 5
TRANSITIONTIME = 10
ITEMS = 180
HOURSBEFOREMIDNIGHT = 2  # stop at 22:00h hr
r = 0.25

# Shared state variables
stop_event = threading.Event()
pause_event = threading.Event()
bri_lock = threading.Lock()
bri = NORMAL_BRIGHTNESS

# Utility function to determine stop time
def is_time_to_stop():
    midnight = datetime.combine(date.today(), datetime.min.time()) + timedelta(days=1)
    stop_time = midnight - timedelta(hours=HOURSBEFOREMIDNIGHT)
    return datetime.now() >= stop_time

# Motion sensor thread
def sensor_thread():
    """Monitor motion sensor and halt the main thread during motion detection."""
    global bri
    while not stop_event.is_set():
        try:
            # Check motion sensor state
            response = client.get(sensorstatus)
            myjson = response.json()
            if myjson["state"]["presence"]:
                print(f"Motion detected at {datetime.now()}, pausing color changes.")
                SENSORACTIVATED = True
                pause_event.set()  # Signal the main thread to pause
                with bri_lock:
                    bri = 254
                # Send brightness update to the bulb
                myjson = {'bri': bri, 'xy': [0.3,0.35]}  
                client.put(action1, json=myjson)
                time.sleep(SENSORTIMEOUT)  # Wait for motion timeout

                print(f"Resuming color changes at {datetime.now()}.")
                SENSORACTIVATED = False
                with bri_lock:
                    bri = NORMAL_BRIGHTNESS
                pause_event.clear()  # Signal the main thread to resume
                #main_thread()
        except Exception as e:
            print(f"Sensor thread error: {e}")
        time.sleep(1)  # Polling interval for the motion sensor

def main_thread():
    """Calculate and send color updates to the Hue bulb."""
    global bri
    print(f"Script started at {datetime.now()}")

    # Turn lights on
    myjson = {"on": True, "bri": NORMAL_BRIGHTNESS}
    try:
        client.put(action1, json=myjson)
    except Exception as e:
        print(f"Error turning on lights: {e}")

    i = 1
    while True:
        if not SENSORACTIVATED:
            # Check stop condition
            if is_time_to_stop():
                print(f"Stopping script at {datetime.now()}")
                myjson = {"on": False}
                try:
                    client.put(action1, json=myjson)
                except Exception as e:
                    print(f"Error turning off lights: {e}")
                stop_event.set()
                return

            # Wait if motion is detected
            if pause_event.is_set():
                print("Main thread paused due to motion detection.")

                while pause_event.is_set():
                    pause_event.wait()

                print(f"Resuming color changes at {datetime.now()}.")

            # Generate x, y values for the current step on the circle
            x = round(0.33 + r * math.cos(2 * math.pi * i / ITEMS), 4)
            y = round(0.37 + r * math.sin(2 * math.pi * i / ITEMS), 4)

            # Send light update
            with bri_lock:
                myjson = {"bri": bri, "xy": [x, y], "transitiontime": TRANSITIONTIME}
            try:
                response = client.put(action1, json=myjson)
                if response.status_code != 200:
                    print(f"Command failed: {response.status_code}")
            except Exception as e:
                print(f"Error updating lights: {e}")

            time.sleep(TIMEINTERVAL)  # Delay before the next color change

            i += 1  # Increment index
            if i >= ITEMS:
                i = 1  # Reset index
# Start threads
def main():
    global client
    client = Client(timeout=100)
    global SENSORACTIVATED 
    SENSORACTIVATED = False

    # Create threads
    sensor = threading.Thread(target=sensor_thread, daemon=True)
    main_color = threading.Thread(target=main_thread, daemon=True)

    # Start threads
    sensor.start()
    main_color.start()

    # Wait for threads to finish
    sensor.join()
    main_color.join()

if __name__ == "__main__":
    main()