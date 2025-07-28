using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Hubs
{
    public class ChatHub : Hub
    {
        private static readonly ConcurrentBiDictionary<string, string> _connections = [];

        public async Task SendToMe(string message)
        {
            if (!_connections.ContainsKey(Context.ConnectionId))
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
            await client.SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections[Context.ConnectionId], message, false);
        }

        public async Task SendToAll(string message)
        {
            if (!_connections.ContainsKey(Context.ConnectionId))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }
            await Clients.All.SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections[Context.ConnectionId], message, false);
        }

        public async Task SendToUser(string username, string message)
        {
            if (!_connections.ContainsKey(Context.ConnectionId))
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
            var connectionId = _connections.GetKeyByValue(username);
            if (!string.IsNullOrEmpty(connectionId))
            {
                await Clients.Client(connectionId).SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections[Context.ConnectionId], message, true);
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
            _connections[Context.ConnectionId] = username;
            await Clients.All.SendAsync("UserSignedIn", username);
        }

        public async Task UserSignOut(string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                await Clients.Caller.SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }
            _connections.TryRemoveByKey(Context.ConnectionId, out _);
            await Clients.All.SendAsync("UserSignedOut", username);
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            if (_connections.TryRemoveByKey(Context.ConnectionId, out var username))
            {
                Clients.All.SendAsync("UserSignedOut", username);
            }
            return base.OnDisconnectedAsync(exception);
        }
    }
}
