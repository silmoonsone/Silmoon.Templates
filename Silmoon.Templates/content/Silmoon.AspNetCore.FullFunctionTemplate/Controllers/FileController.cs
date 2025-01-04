using Microsoft.AspNetCore.Mvc;
using Silmoon.AspNetCore.FullFunctionTemplate.Models;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Controllers
{
    public class FileController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
        public IActionResult UploadImage()
        {
            User user = new User()
            {
                Username = "silmoon"
            };
            return View(user);
        }
        public IActionResult UploadPicture()
        {
            User user = new User()
            {
                Username = "silmoon"
            };
            return View(user);
        }
        public IActionResult UploadFile()
        {
            User user = new User()
            {
                Username = "silmoon"
            };
            return View(user);
        }
    }
}
