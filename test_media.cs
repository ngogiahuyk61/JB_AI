using System;
using System.Net.Http.Headers;
public class Program {
    public static void Main() {
        try {
            var m = MediaTypeHeaderValue.Parse(""audio/mp4; codecs=\""mp4a.40.2\"""");
            Console.WriteLine(""Success"");
        } catch(Exception e) {
            Console.WriteLine(e.GetType().Name + "": "" + e.Message);
        }
    }
}
