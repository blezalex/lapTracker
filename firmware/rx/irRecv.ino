#include <Arduino.h>

#include <IRremote.h>


int RECV_PIN = 11;

IRrecv irrecv(RECV_PIN);

bool state;

decode_results results;

void setup()
{
  pinMode(13, OUTPUT);

  Serial.begin(9600);
  irrecv.enableIRIn(); // Start the receiver
}

void loop() {    
  	if (irrecv.decode(&results)) {
  		digitalWrite(13, HIGH);
  		delay(10);
  		irrecv.resume(); // resume receiver
  		Serial.println(results.value, HEX);
  		digitalWrite(13, LOW);
  	}
}