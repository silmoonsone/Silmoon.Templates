using Microsoft.AspNetCore.SignalR;
using Silmoon.Collections;
using SkiaSharp;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Hubs
{
    public class ChatHub : Hub
    {
        public ConcurrentTwoWayDictionary<string, string> _connections { get; init; } = [];

        public async Task SendToMe(string message)
        {
            if (!_connections.ContainsValue(Context.ConnectionId))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }
            var client = Clients.Caller;
            await client.SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections.GetKeysOrDefault(Context.ConnectionId).FirstOrDefault(), message, false);
        }

        public async Task SendToAll(string message)
        {
            if (!_connections.ContainsValue(Context.ConnectionId))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }
            await Clients.All.SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections.GetKeysOrDefault(Context.ConnectionId).FirstOrDefault(), message, false);
        }

        public async Task SendToUser(string username, string message)
        {
            if (!_connections.ContainsValue(Context.ConnectionId))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(username))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }

            if (_connections.TryGetValues(username, out var connectionIds))
            {
                foreach (var connectionId in connectionIds)
                {
                    await Clients.Client(connectionId).SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections.GetKeysOrDefault(Context.ConnectionId).FirstOrDefault(), message, true);
                }
            }
            else
            {
                await Clients.Caller.SendAsync("ErrorMessage", $"User '{username}' does not exist.");
            }
        }

        public async Task UserSignIn(string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (_connections.ContainsValue(username))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Username already exists.");
                return;
            }

            _connections.Add(username, Context.ConnectionId);
            await Clients.All.SendAsync("UserSignedIn", username);
        }

        public async Task UserSignOut(string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                await Clients.Client(Context.ConnectionId).SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (_connections.Remove(username, Context.ConnectionId))
            {
                await Clients.All.SendAsync("UserSignedOut", username);
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_connections.GetKeysOrDefault(Context.ConnectionId).FirstOrDefault() is string username)
            {
                _connections.Remove(username, Context.ConnectionId);
                await Clients.All.SendAsync("UserSignedOut", username);
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
}
