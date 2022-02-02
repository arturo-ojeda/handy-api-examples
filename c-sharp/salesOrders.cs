using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Handy
{
  public class HandyAPI
    {

        public  List<salesorder> salesOrders { get; set; }
        public Pagination pagination { get; set; }
    }
    public class salesorder
    {
        public int id { get; set; }
        public int externalId { get; set; }
    }
    public class Pagination
    {
        public int totalCount { get; set; }
        public int totalPages { get; set; }
        public object currentPage { get; set; }
        public object nextPage { get; set; }
        public object prevPage { get; set; }
        public object firstPage { get; set; }
        public object lastPage { get; set; }
    }
}
