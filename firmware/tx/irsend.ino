#include <Arduino.h>

#include <IRremote.h>



IRsend irsend;

void setup()
{
  Serial.begin(9600);
  pinMode(A2, OUTPUT);
  pinMode(A3, OUTPUT);

  digitalWrite(A2, HIGH);
  digitalWrite(A3, HIGH);
}

void loop() {

      irsend.sendSony(0xa90, 12); // Sony TV power code
      
      delay(40);
}