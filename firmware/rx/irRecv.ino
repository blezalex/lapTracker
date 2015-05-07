#include <Arduino.h>

// recv pin = 2

#define STATE_WAITING_HEADER 0
#define WAITING_BITS 1


volatile uint8_t state = STATE_WAITING_HEADER;
volatile unsigned long lowStartTime;
volatile int8_t bitGroupIdx = -1;
volatile unsigned long highStartTime;
volatile uint8_t data = 0;

int8_t decodePulse(unsigned long duration)
{
  if (duration < 150) // 263
    return -1;

  if (duration < 340) // 421
    return 0;

  if (duration < 450) // 578
    return 1;

  if (duration < 650) // 736
    return 0b10;

  if (duration < 850)
    return 0b11;

  return -1;
}

bool updateData(unsigned long highDuration)
{
  int8_t decoded = decodePulse(highDuration);

  if (decoded == -1)
    return false;

  data |= ((uint8_t)decoded) << (2*bitGroupIdx);

  return true;
}

void onDataReceived(uint8_t data)
{
  Serial.println(data, HEX);
}

void onIrDataPinChange(){
  uint8_t newState = PIND & (1 <<2);

  unsigned long time = micros();
  unsigned long lowDuration = time - lowStartTime;

  switch (state) {
       case STATE_WAITING_HEADER:
         
         // HIGH -> LOW
         if (newState == 0)
         {
            lowStartTime = time;
            return;
         }

         // LOW -> HIGH
         if (lowDuration > 300 && lowDuration < 500)
       {
        state = WAITING_BITS;
        return;
       }
         break;

       case WAITING_BITS:
        // HIGH -> LOW
          if (newState == 0)
          {
            lowStartTime = time;

            if (bitGroupIdx >= 0)
            {
              if (bitGroupIdx < 4) {
                unsigned long highDuration = time - highStartTime; 
                if (!updateData(highDuration))
                {
                  state = STATE_WAITING_HEADER;
                  return;
                };
              }
              else
              {
                uint8_t dataCopy = data;
                data = 0; 
                onDataReceived(dataCopy);
                state = STATE_WAITING_HEADER;
              }
            }

            return;
          }

          // LOW -> HIGH
        if (lowDuration > 100 && lowDuration < 250)
        {
          bitGroupIdx++;
          highStartTime = time;
          return;
        }
         // do something
         break;
   }

  state = STATE_WAITING_HEADER;
  bitGroupIdx = -1;
}


void setup()
{
  pinMode(13, OUTPUT);

  Serial.begin(9600);

  attachInterrupt(0, onIrDataPinChange, CHANGE);
}

void loop() {
}