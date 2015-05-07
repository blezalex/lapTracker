#include <arduino.h>

#define CARRIER_FREQ 38  // in khz

#define HEADER_HIGH_LEN 15
#define HEADER_LOW_LEN 10
#define DATA_HIGH_LEN 6

uint8_t dataLowLen[] = { 10, 16, 22, 28};

volatile uint8_t ovfCnt = 0;

inline void sendPulses(uint8_t pulses, bool high)
{
//	uint16_t dealyUs = 1000 / CARRIER_FREQ * pulses;
//	delayMicroseconds(dealyUs);

	uint8_t currentVal = ovfCnt;
	while(currentVal == ovfCnt); // wait until once cycle finishes

	if (high)
	{
		TCCR2A |= _BV(COM2B1);
	}

	TIMSK2 = 0;
	uint8_t finOvfCntVal = ovfCnt + pulses;
	TIMSK2 = _BV(TOIE2);

	while (ovfCnt != finOvfCntVal)
	{
	}

	TCCR2A &= ~(_BV(COM2B1));
}

void sendHigh(uint8_t pulses)
{
	sendPulses(pulses, true);
	//delayPulses(pulses);
}

void sendLow(uint8_t pulses)
{
	sendPulses(pulses, false);
	//TCCR2A &= ~(_BV(COM2B1));
	//delayPulses(pulses);
}

void sendHeader()
{
	sendHigh(HEADER_HIGH_LEN);
	sendLow(HEADER_LOW_LEN);
}

void sendData(uint8_t data)
{
	if (data > 0b11)
	{
		Serial.print("bad data");
		Serial.println(data);
		return;
	}

	sendHigh(DATA_HIGH_LEN);
	sendLow(dataLowLen[data]);
}

void sendQuadId(uint8_t id)
{
	uint8_t idLow = id & 0b11;
	uint8_t idMid = (id >> 2) & 0b11; 
	uint8_t idHigh = (id >> 4) & 0b11; 
	uint8_t idCheckSum = idHigh ^ idMid ^ idLow;

	sendHeader();
	sendData(idLow);
	sendData(idMid);
	sendData(idHigh);

	sendData(idCheckSum);

	sendData(0); // extra two bits to separate last bits
}


void setup()
{
  Serial.begin(9600);

  pinMode(3, OUTPUT);

  TCCR2A = _BV(COM2B1) | _BV(WGM21) | _BV(WGM20); // Just enable output on Pin 3 and disable it on Pin 11
  TCCR2B = _BV(WGM22) | _BV(CS22);
  OCR2A = 51; // defines the frequency 51 = 38.4 KHz, 54 = 36.2 KHz, 58 = 34 KHz, 62 = 32 KHz
  OCR2B = 26;  // deines the duty cycle - Half the OCR2A value for 50%
  TCCR2B = TCCR2B & 0b00111000 | 0x2; // select a prescale value of 8:1 of the system clock

  TIFR2 = _BV(TOV2);
  TIMSK2 = _BV(TOIE2);

  // TCCR2A = (1 << COM2B1) | (1 << WGM20) | (1 << WGM21) | (1 << WGM22);
  // TCCR2B = (1<< CS20);

  // OCR2B = 126;
}

ISR(TIMER2_OVF_vect)
{
	++ovfCnt;
}

void loop() {

	sendQuadId(12);

	delay(2); // should be at leat 5 since message is 4 ms long
}