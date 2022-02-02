using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using Quartz;
using Quartz.Impl;
using RestSharp;
using static Quartz.MisfireInstruction;

namespace Handy
{
    class Program
    {
        //Default every 10 min
        static string interval = "0 0/10 * * * ?";

        static void Main(string[] args)
        {
            StdSchedulerFactory factory = new StdSchedulerFactory();
            IScheduler scheduler = factory.GetScheduler();
            scheduler.Start();
            IJobDetail job = JobBuilder.Create<SimpleJob>().WithIdentity("myJob", "group1").Build();

            ITrigger trigger = TriggerBuilder.Create().WithIdentity("mytrigger", "group1").WithCronSchedule(interval).ForJob(job).Build();
            scheduler.ScheduleJob(job, trigger);
            Console.WriteLine("Cronjob Started");
        }
    }
    public class SimpleJob : Quartz.IJob
    {
        HandyAPI sales = new HandyAPI();
        string Token = System.IO.File.ReadAllText(Application.StartupPath + "\\.env");

        private void businessLogic(List<salesorder> sales, bool deleted)
        {
            if (deleted)
            {
                Console.WriteLine("Fetched deleted orders. Recevied " + sales.Count + " sales orders");
            }
            else
            {
                Console.WriteLine("Fetched created orders. Recevied " + sales.Count + " sales orders");
            }
            foreach (var salesOrder in sales)
            {
                if (deleted)
                {
                    // A sales order was deleted in Handy
                    // If you want, you can delete the externalId from your system.
                }
                else
                {
                    // *****
                    // Implement your business logic here:
                    // ✅ Save sales order in your ERP or system.
                    // *****

                    // Once you saved the sales order in your system, 
                    // you can save the externalId on the sales order with the Handy API
                    // for future reference if the sales order is deleted in Handy.
                    // Then you can easily find the corresponding sales order in your system
                    // and delete it too.
                    saveExternalIdOnSalesOrder(salesOrder.id, salesOrder.externalId);
                }
            }
        }

        public void Execute(Quartz.IJobExecutionContext context)
        {
            jobFunction();
        }

        public void jobFunction()
        {
            fetchSalesOrders(false);
            fetchSalesOrders(true);
        }

        private void fetchSalesOrders(bool deleted)
        {
            string FilePath = "";
            StartEndDateTime dt = new StartEndDateTime();

            FilePath = System.Windows.Forms.Application.StartupPath + (deleted ? "\\last_time_deleted.json" : "\\last_time.json");

            if ((System.IO.File.ReadAllText(FilePath) == ""))
            {
                dt.Start = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss");
                dt.End = dt.Start;
            }
            else
            {
                dt.Start = System.IO.File.ReadAllText(FilePath).ToString();
                dt.End = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss");
            }
            string URL = "https://app.handy.la/api/v2/salesOrder?start=" + dt.Start + "&end=" + dt.End + "&deleted=" + deleted;
            IRestResponse response = queryhandyapi(URL);

            if (response.StatusCode.ToString() == "OK")
            {
                sales = JsonConvert.DeserializeObject<HandyAPI>(response.Content);
                while (sales.pagination.currentPage != sales.pagination.lastPage)
                {
                    response = queryhandyapi(sales.pagination.nextPage.ToString());
                    if (response.StatusCode.ToString() == "200")
                    {
                        Dictionary<string, salesorder> obj = new Dictionary<string, salesorder>();
                        obj = JsonConvert.DeserializeObject<Dictionary<string, salesorder>>(response.Content);
                        foreach (var item in obj)
                        {
                            salesorder ob1 = new salesorder();
                            ob1.externalId = item.Value.externalId;
                            ob1.id = item.Value.id;
                            sales.salesOrders.Add(ob1);
                        }

                    }
                }
                businessLogic(sales.salesOrders, deleted);
            }
            else
            {
                Console.WriteLine("Something is Wrong");
            }

            System.IO.File.WriteAllText(FilePath, dt.End);
        }

        private void saveExternalIdOnSalesOrder(int id, int externalId)
        {
            var client = new RestClient("https://app.handy.la/api/v2/salesOrder/" + id);
            client.Timeout = -1;
            var request = new RestRequest(Method.PUT);
            request.AddHeader("Authorization", "Bearer " + Token);
            request.AddHeader("Content-Type", "application/json");
            var body = @"{" + "\n" + @"  ""externalId"": " + externalId + "" + "\n" + @"}";
            request.AddParameter("application/json", body, ParameterType.RequestBody);
            IRestResponse response = client.Execute(request);
            if (response.StatusCode.ToString() == "OK")
            {
                Console.WriteLine("Saved external id " + externalId + " on sales order " + id);
            }
            else
            {
                Console.WriteLine("Error in saving external id " + externalId + " on sales order " + id);
            }
        }

        IRestResponse queryhandyapi(string URL)
        {
            var client = new RestClient(URL);
            var request = new RestRequest(Method.GET);
            request.AddHeader("Authorization", "Bearer " + Token);
            request.AddHeader("Content-Type", "application/json");
            IRestResponse response = client.Execute(request);
            if (response.StatusCode.ToString() == "429")
            {
                Console.WriteLine("Rate limit reached. Waiting for 60 seconds.");
                Thread.Sleep(60000);
                return queryhandyapi(URL);
            }

            return response;
        }

    }
}

