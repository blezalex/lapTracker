using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace LapTracker
{
    public partial class Form1 : Form
    {
        StreamReader sr;

        Dictionary<string, DateTime> lastSeenTime = new Dictionary<string, DateTime>();

        static TimeSpan MinLapTime = TimeSpan.FromSeconds(5);
       
        public Form1()
        {
            InitializeComponent();
        }

        

        private async void Form1_Load(object sender, EventArgs e)
        {
            serialPort1.PortName = System.Configuration.ConfigurationSettings.AppSettings["portName"];
            serialPort1.Open();

            sr = new StreamReader(serialPort1.BaseStream);
            
            while(true)
            {
                var id = await sr.ReadLineAsync();
                textBox1.AppendText(id + Environment.NewLine);

                var currentTime = DateTime.Now;
                if (!lastSeenTime.ContainsKey(id))
                {
                    lastSeenTime.Add(id, currentTime);
                    continue;
                }

                var lastSeenCurrentId = lastSeenTime[id];
                if (currentTime - lastSeenCurrentId < MinLapTime)
                    continue; // ignore as seen in less than lap time

                textBox2.AppendText(string.Format("{0} Lap time: {1}\r\n", id, currentTime - lastSeenCurrentId));
                lastSeenTime[id] = currentTime;
            }
            
        }
    }
}
